import { sendTemplate } from "./sendTemplate.js";

export async function handleReply(message) {
  const messageText = message.message.toLowerCase();
  let element_name;
  let parameters = [];

  switch (true) {
    case /^[1-3] star$/.test(messageText):
      element_name = "reply";
      parameters = [];
      break;
    case /^[4-5] star$/.test(messageText):
      element_name = "google_review";
      parameters = ["25"];
      break;
    case ["hii", "hi", "hiii", "hello", "helo", "helloo"].some((word) =>
      messageText.includes(word)
    ):
      element_name = "start";
      parameters = ["Sir/Ma'am", "FOODCHOW"];
      break;
    case messageText.includes("help"):
      element_name = "customer_support";
      break;
    case messageText.includes("promo"):
      element_name = "promotional_offer";
      break;
    default:
      element_name = null;
  }

  if (element_name) {
    const fakeRequest = {
      body: {
        phoneNumber: message.from,
        customer_id: message.customer_id,
        contact_id: message.contact_id,
        element_name: element_name,
        languageCode: "en",
        parameters: parameters,
      },
    };
    const fakeResponse = {
      status: (code) => ({
        json: (data) => console.log(`Response (${code}):`, data),
      }),
    };

    try {
      await sendTemplate(fakeRequest, fakeResponse);
    } catch (err) {
      console.error("sendTemplate failed in handleReply:", err);
    }
  }
}
