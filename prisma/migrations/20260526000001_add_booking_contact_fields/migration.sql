-- AlterTable: add contact customer fields to Booking
ALTER TABLE `Booking`
  ADD COLUMN `contact_customer_first_name` VARCHAR(191) NULL,
  ADD COLUMN `contact_customer_last_name`  VARCHAR(191) NULL,
  ADD COLUMN `contact_customer_phone`      VARCHAR(191) NULL,
  ADD COLUMN `contact_customer_email`      VARCHAR(191) NULL;
