-- AlterTable
ALTER TABLE `Menu` ADD COLUMN `image` VARCHAR(191) NULL,
    ADD COLUMN `price` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `Restaurant` ADD COLUMN `banner_image` VARCHAR(191) NULL,
    ADD COLUMN `dress_code` VARCHAR(191) NULL,
    ADD COLUMN `image` VARCHAR(191) NULL,
    ADD COLUMN `max_capacity` INTEGER NULL,
    ADD COLUMN `min_capacity` INTEGER NULL,
    ADD COLUMN `parking_available` BOOLEAN NOT NULL DEFAULT false;
