-- AlterTable: add admin_note to Restaurant
ALTER TABLE `Restaurant`
  ADD COLUMN `admin_note` TEXT NULL;
