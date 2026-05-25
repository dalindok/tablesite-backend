-- CreateTable
CREATE TABLE `RestaurantRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `owner_id` INTEGER NOT NULL,
    `current_count` INTEGER NOT NULL,
    `requested_count` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `admin_note` TEXT NULL,
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `RestaurantRequest_owner_id_status_idx`(`owner_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RestaurantRequest` ADD CONSTRAINT `RestaurantRequest_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `RestaurantOwner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RestaurantRequest` ADD CONSTRAINT `RestaurantRequest_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `Admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
