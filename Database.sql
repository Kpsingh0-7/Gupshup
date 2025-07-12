-- DATABASE CREATION
CREATE DATABASE IF NOT EXISTS Marketing;
USE Marketing;
SET GLOBAL time_zone = '+00:00';
SELECT NOW(), UTC_TIMESTAMP();

-- CUSTOMER TABLE
CREATE TABLE `customer` (
    `customer_id` BIGINT NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(255) DEFAULT NULL,
    `last_name` VARCHAR(50) DEFAULT NULL,
    `mobile_no` VARCHAR(20) DEFAULT NULL,
    `profile_image` VARCHAR(255) DEFAULT NULL,
    `email_id` VARCHAR(100) DEFAULT NULL,
    `password` VARCHAR(50) DEFAULT NULL,
    `address` VARCHAR(500) DEFAULT NULL,
    `total_credit` DECIMAL(10,2) DEFAULT 0.00,
    `total_credit_consumed` DECIMAL(10, 2) DEFAULT 0.00,
    `total_credit_remaining` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- CUSTOMER CREDIT USAGE TABLE
CREATE TABLE `customer_credit_usage` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NOT NULL,
    `usage_date` DATE NOT NULL,
    `credit_consumed` DECIMAL(10, 2) DEFAULT 0.00,
    `credit_remaining` DECIMAL(10, 2) DEFAULT 0.00,
    `messages_sent` INT DEFAULT 0,
    `messages_received` INT DEFAULT 0,
    `total_cost` DECIMAL(10, 2) DEFAULT 0.00,
    `gupshup_fees` DECIMAL(10, 2) DEFAULT 0.00,
    `meta_fees` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- CONTACT TABLE
CREATE TABLE `contact` (
    `contact_id` BIGINT NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(255) DEFAULT NULL,
    `last_name` VARCHAR(50) DEFAULT NULL,
    `country_code` VARCHAR(5),
    `mobile_no` VARCHAR(20) DEFAULT NULL,
    `profile_image` VARCHAR(255) DEFAULT NULL,
    `customer_id` BIGINT DEFAULT NULL,
    `couponcode` VARCHAR(20),
    `birthday` DATE,
    `anniversary` DATE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`contact_id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- CONTACT GROUP TABLE
CREATE TABLE `contact_group` (
    `group_id` BIGINT NOT NULL AUTO_INCREMENT,
    `group_name` VARCHAR(255) NOT NULL,
    `customer_id` BIGINT,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`group_id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- CONTACT GROUP MAP
CREATE TABLE `contact_group_map` (
    `contact_id` BIGINT NOT NULL,
    `group_id` BIGINT NOT NULL,
    `added_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`contact_id`, `group_id`),
    FOREIGN KEY (`contact_id`) REFERENCES `contact`(`contact_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`group_id`) REFERENCES `contact_group`(`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- BROADCASTS
CREATE TABLE `broadcasts` (
    `broadcast_id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NOT NULL,
    `broadcast_name` VARCHAR(255) NOT NULL,
    `customer_list` VARCHAR(255),
    `message_type` VARCHAR(100),
    `schedule` VARCHAR(10),
    `schedule_date` DATETIME NULL,
    `status` VARCHAR(50),
    `type` VARCHAR(50),
    `selected_template` VARCHAR(255),
    `template_id` VARCHAR(255),
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `sent` INT DEFAULT 0,
    `delivered` INT DEFAULT 0,
    `read` INT DEFAULT 0,
    `clicked` INT DEFAULT 0,
    PRIMARY KEY (`broadcast_id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- WHATSAPP TEMPLATES
CREATE TABLE `whatsapp_templates` (
    `id` VARCHAR(50) PRIMARY KEY,
    `external_id` VARCHAR(50),
    `app_id` VARCHAR(50),
    `waba_id` VARCHAR(50),
    `element_name` VARCHAR(100),
    `category` VARCHAR(50),
    `language_code` VARCHAR(10),
    `template_type` VARCHAR(20),
    `status` VARCHAR(20),
    `data` TEXT,
    `container_meta` JSON,
    `created_on` BIGINT,
    `modified_on` BIGINT
);

-- CUSTOMER TEMPLATE MAP
CREATE TABLE `customer_template_map` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `customer_id` BIGINT NOT NULL,
    `template_id` VARCHAR(50) NOT NULL,
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- GUPSHUP CONFIGURATION
CREATE TABLE `gupshup_configuration` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NOT NULL,
    `gupshup_id` VARCHAR(36) NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- CONVERSATIONS
CREATE TABLE `conversations` (
    `conversation_id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NOT NULL,
    `contact_id` BIGINT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_message_time` TIMESTAMP NULL DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`conversation_id`),
    UNIQUE KEY `shop_guest_unique` (`customer_id`, `contact_id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`contact_id`) REFERENCES `contact`(`contact_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- MESSAGES
CREATE TABLE `messages` (
    `message_id` BIGINT NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT,
    `sender_type` ENUM('shop', 'guest', 'system') NOT NULL,
    `sender_id` BIGINT NOT NULL,
    `message_type` ENUM('text', 'image', 'template', 'location', 'document', 'audio', 'video', 'button') NOT NULL DEFAULT 'text',
    `content` TEXT,
    `element_name` VARCHAR(100),
    `template_data` JSON DEFAULT NULL,
    `media_url` VARCHAR(255) DEFAULT NULL,
    `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `delivered_at` TIMESTAMP NULL DEFAULT NULL,
    `read_at` TIMESTAMP NULL DEFAULT NULL,
    `received_at` TIMESTAMP NULL DEFAULT NULL,
    `status` ENUM('sent', 'delivered', 'read', 'failed', 'received') NOT NULL DEFAULT 'sent',
    `external_message_id` VARCHAR(100) DEFAULT NULL,
    PRIMARY KEY (`message_id`),
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`conversation_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
