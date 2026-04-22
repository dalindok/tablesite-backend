import { prisma } from "./prisma.ts";

/**
 * Creates related restaurant records (operating hours, tables, tags, etc.)
 * after a restaurant is created from import data
 */
export const createRestaurantRelatedRecords = async (
  restaurantId: number,
  restaurantData: any,
) => {
  // Create operating hours
  if (
    restaurantData.operating_hours &&
    restaurantData.operating_hours.length > 0
  ) {
    await prisma.operatingHour.createMany({
      data: restaurantData.operating_hours.map((oh: any) => ({
        restaurant_id: restaurantId,
        day_of_week: oh.day_of_week,
        open_time: oh.open_time,
        close_time: oh.close_time,
        is_closed: oh.is_closed || false,
      })),
    });
  }

  // Create tables
  if (restaurantData.tables && restaurantData.tables.length > 0) {
    await prisma.table.createMany({
      data: restaurantData.tables.map((table: any) => ({
        restaurant_id: restaurantId,
        table_number: table.table_number,
        capacity: table.capacity,
        floor: table.floor || null,
        description: table.description || null,
      })),
    });
  }

  // Create special closures
  if (
    restaurantData.special_closures &&
    restaurantData.special_closures.length > 0
  ) {
    await prisma.specialClosure.createMany({
      data: restaurantData.special_closures.map((closure: any) => ({
        restaurant_id: restaurantId,
        date: new Date(closure.date),
        reason: closure.reason || null,
      })),
    });
  }

  // Create tags
  if (restaurantData.tags && restaurantData.tags.length > 0) {
    for (const tagName of restaurantData.tags) {
      let tag = await prisma.tag.findUnique({
        where: { name: tagName },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: tagName },
        });
      }

      await prisma.restaurantTag.create({
        data: {
          restaurant_id: restaurantId,
          tag_id: tag.id,
        },
      });
    }
  }

  // Create gallery images
  if (
    restaurantData.gallery_images &&
    restaurantData.gallery_images.length > 0
  ) {
    await prisma.restaurantImage.createMany({
      data: restaurantData.gallery_images.map((image: any) => ({
        restaurant_id: restaurantId,
        url: image.url,
        caption: image.caption || null,
        sort_order: image.sort_order || 0,
      })),
    });
  }

  // Create menus and menu items
  if (restaurantData.menus && restaurantData.menus.length > 0) {
    for (const menuData of restaurantData.menus) {
      const menu = await prisma.menu.create({
        data: {
          restaurant_id: restaurantId,
          name: menuData.name,
          description: menuData.description || null,
          price: menuData.price || null,
          image: menuData.image || null,
          is_active: menuData.is_active !== false,
          sort_order: menuData.sort_order || 0,
        },
      });

      // Create menu items
      if (menuData.menu_items && menuData.menu_items.length > 0) {
        await prisma.menuItem.createMany({
          data: menuData.menu_items.map((item: any) => ({
            menu_id: menu.id,
            name: item.name,
            description: item.description || null,
            price: item.price,
            image_url: item.image_url || null,
            category: item.category || null,
            is_available: item.is_available !== false,
            is_vegan: item.is_vegan || false,
            is_vegetarian: item.is_vegetarian || false,
            is_gluten_free: item.is_gluten_free || false,
            sort_order: item.sort_order || 0,
          })),
        });
      }
    }
  }
};
