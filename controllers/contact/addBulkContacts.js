import { pool } from "../../config/db.js";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import mammoth from "mammoth";

const mapContactRow = (row) => {
  const values = row.map((val) => val?.trim() || null);

  const first_name = values[0];
  const last_name = values[1] || null;
  const mobile_no = values[2];
  const country_code = values[3];
  const couponcode = values[4] || null;
  const birthday = values[5] || null;
  const anniversary = values[6] || null;

  if (!first_name || !mobile_no || !country_code) {
    throw new Error("Missing required fields in row");
  }

  return {
    first_name,
    last_name,
    mobile_no,
    country_code,
    couponcode,
    birthday,
    anniversary,
  };
};

export const addBulkContacts = async (req, res) => {
  const customer_id = parseInt(req.body.customer_id, 10);
  const group_name_raw = req.body.group_name;
  const file = req.file;

  const group_name =
    typeof group_name_raw === "string" ? group_name_raw.trim() : null;

  console.log("✅ Parsed values:", { customer_id, group_name, fileExists: !!file });

  if (!customer_id || !group_name || !file) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: customer_id, group_name, or file",
      debug: { customer_id, group_name, fileExists: !!file },
    });
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const filePath = file.path;
  const connection = await pool.getConnection();

  try {
    let contacts = [];

    if (extension === ".csv") {
      const content = fs.readFileSync(filePath, "utf-8");
      const records = parse(content, {
        skip_empty_lines: true,
        relax_column_count: true, // <-- Allow variable columns
      });

      records.splice(0, 1); // Remove header

      for (const row of records) {
        try {
          const contact = mapContactRow(row);
          contacts.push(contact);
        } catch (err) {
          console.warn(
            "⚠️ Skipping invalid row:",
            row,
            "| Error:",
            err.message
          );
        }
      }
    } else if (extension === ".docx") {
      const { value } = await mammoth.extractRawText({ path: filePath });
      const lines = value
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      for (let i = 1; i < lines.length; i++) {
        try {
          let fields = lines[i].split(",").map((val) => val.trim());
          while (fields.length < 7) fields.push(""); // Pad with empty strings to ensure 7 columns
          const contact = mapContactRow(fields);
          contacts.push(contact);
        } catch (err) {
          console.warn(
            "⚠️ Skipping invalid line:",
            lines[i],
            "| Error:",
            err.message
          );
        }
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported file format" });
    }

    if (contacts.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid contacts found" });
    }

    await connection.beginTransaction();

    // Check if group already exists
    const [groupRows] = await connection.execute(
      "SELECT group_id FROM contact_group WHERE group_name = ? AND customer_id = ?",
      [group_name, customer_id]
    );

    if (groupRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Group '${group_name}' already exists for this shop. Try a different group name.`,
      });
    }

    // Insert new group
    const [groupInsert] = await connection.execute(
      "INSERT INTO contact_group (group_name, customer_id) VALUES (?, ?)",
      [group_name, customer_id]
    );
    const group_id = groupInsert.insertId;

    // Insert or reuse contacts, then map to group
    const insertedIds = [];

    for (const contact of contacts) {
      let contact_id;

      const [existing] = await connection.execute(
        "SELECT contact_id FROM contact WHERE customer_id = ? AND mobile_no = ?",
        [customer_id, contact.mobile_no]
      );

      if (existing.length > 0) {
        contact_id = existing[0].contact_id;
      } else {
        const [insert] = await connection.execute(
          `INSERT INTO contact 
           (customer_id, country_code, first_name, last_name, mobile_no, couponcode, birthday, anniversary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customer_id,
            contact.country_code,
            contact.first_name,
            contact.last_name,
            contact.mobile_no,
            contact.couponcode,
            contact.birthday,
            contact.anniversary,
          ]
        );
        contact_id = insert.insertId;
        insertedIds.push(contact_id);
      }

      await connection.execute(
        `INSERT IGNORE INTO contact_group_map (contact_id, group_id) VALUES (?, ?)`,
        [contact_id, group_id]
      );
    }

    await connection.commit();
    return res.status(201).json({
      success: true,
      message: `${insertedIds.length} contact(s) added to group "${group_name}"`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Bulk insert failed:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  } finally {
    connection.release();
    fs.unlinkSync(filePath);
  }
};
