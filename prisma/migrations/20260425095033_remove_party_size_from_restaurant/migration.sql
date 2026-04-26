/*
  Warnings:

  - You are about to drop the column `max_party_size` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `min_party_size` on the `Restaurant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Restaurant` DROP COLUMN `max_party_size`,
    DROP COLUMN `min_party_size`;
