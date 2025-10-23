export const DEFAULT_FOODS = [
  // Meat & Poultry
  { id: 'chicken_breast', name: 'صدور فراخ مطبوخة', name_en: 'Chicken Breast', unit: 'g', per: 100, kcal: 165, p: 31, c: 0, f: 3.6 },
  { id: 'chicken_thigh', name: 'ورك فراخ مطبوخ', name_en: 'Chicken Thigh', unit: 'g', per: 100, kcal: 209, p: 26, c: 0, f: 10.9 },
  { id: 'chicken_whole', name: 'دجاج كامل', name_en: 'Whole Chicken', unit: 'g', per: 100, kcal: 239, p: 27, c: 0, f: 14 },
  { id: 'turkey_breast', name: 'صدور رومي', name_en: 'Turkey Breast', unit: 'g', per: 100, kcal: 135, p: 30, c: 0, f: 1 },
  { id: 'duck', name: 'بط', name_en: 'Duck', unit: 'g', per: 100, kcal: 337, p: 19, c: 0, f: 28 },
  { id: 'beef_lean', name: 'لحم بقري خالي من الدهون', name_en: 'Lean Beef', unit: 'g', per: 100, kcal: 250, p: 26, c: 0, f: 15 },
  { id: 'beef_minced', name: 'لحم مفروم', name_en: 'Ground Beef', unit: 'g', per: 100, kcal: 254, p: 26, c: 0, f: 17 },
  { id: 'beef_ribeye', name: 'لحم ريب آي', name_en: 'Ribeye Steak', unit: 'g', per: 100, kcal: 291, p: 25, c: 0, f: 21 },
  { id: 'lamb', name: 'لحم ضأن', name_en: 'Lamb', unit: 'g', per: 100, kcal: 294, p: 25, c: 0, f: 21 },

  // Fish & Seafood
  { id: 'fish_tuna', name: 'تونة بالماء', name_en: 'Tuna in Water', unit: 'g', per: 100, kcal: 116, p: 26, c: 0, f: 1 },
  { id: 'fish_salmon', name: 'سالمون مشوي', name_en: 'Grilled Salmon', unit: 'g', per: 100, kcal: 208, p: 20, c: 0, f: 13 },
  { id: 'fish_cod', name: 'سمك قد', name_en: 'Cod', unit: 'g', per: 100, kcal: 82, p: 18, c: 0, f: 0.7 },
  { id: 'fish_sardines', name: 'سردين', name_en: 'Sardines', unit: 'g', per: 100, kcal: 208, p: 25, c: 0, f: 11 },
  { id: 'shrimp', name: 'جمبري مطبوخ', name_en: 'Cooked Shrimp', unit: 'g', per: 100, kcal: 99, p: 24, c: 0, f: 0.3 },
  { id: 'crab', name: 'كابوريا', name_en: 'Crab', unit: 'g', per: 100, kcal: 87, p: 18, c: 0, f: 1.1 },
  { id: 'lobster', name: 'استاكوزا', name_en: 'Lobster', unit: 'g', per: 100, kcal: 89, p: 19, c: 0, f: 0.9 },
  { id: 'mussels', name: 'بلح البحر', name_en: 'Mussels', unit: 'g', per: 100, kcal: 86, p: 12, c: 4, f: 2.2 },

  // Eggs & Dairy
  { id: 'egg', name: 'بيضة (كبيرة)', name_en: 'Egg (Large)', unit: 'piece', per: 1, kcal: 72, p: 6.3, c: 0.4, f: 4.8 },
  { id: 'egg_white', name: 'بياض بيضة', name_en: 'Egg White', unit: 'piece', per: 1, kcal: 17, p: 3.6, c: 0.2, f: 0.1 },
  { id: 'egg_yolk', name: 'صفار بيضة', name_en: 'Egg Yolk', unit: 'piece', per: 1, kcal: 55, p: 2.7, c: 0.6, f: 4.5 },
  { id: 'milk_2', name: 'لبن 2%', name_en: '2% Milk', unit: 'ml', per: 100, kcal: 50, p: 3.3, c: 5, f: 2 },
  { id: 'milk_full', name: 'لبن كامل الدسم', name_en: 'Whole Milk', unit: 'ml', per: 100, kcal: 64, p: 3.3, c: 4.8, f: 3.7 },
  { id: 'milk_skim', name: 'لبن خالي الدسم', name_en: 'Skim Milk', unit: 'ml', per: 100, kcal: 34, p: 3.4, c: 5, f: 0.1 },
  { id: 'yogurt', name: 'زبادي سادة', name_en: 'Plain Yogurt', unit: 'g', per: 100, kcal: 59, p: 10, c: 3.6, f: 0.4 },
  { id: 'greek_yogurt', name: 'زبادي يوناني', name_en: 'Greek Yogurt', unit: 'g', per: 100, kcal: 59, p: 10, c: 3.6, f: 0.4 },
  { id: 'cheese_feta', name: 'جبنة فيتا', name_en: 'Feta Cheese', unit: 'g', per: 100, kcal: 264, p: 14, c: 4, f: 21 },
  { id: 'cheese_cheddar', name: 'جبنة شيدر', name_en: 'Cheddar Cheese', unit: 'g', per: 100, kcal: 403, p: 25, c: 1.3, f: 33 },
  { id: 'cheese_mozzarella', name: 'جبنة موتزاريلا', name_en: 'Mozzarella Cheese', unit: 'g', per: 100, kcal: 280, p: 28, c: 3.1, f: 17 },
  { id: 'cheese_cottage', name: 'جبنة قريش', name_en: 'Cottage Cheese', unit: 'g', per: 100, kcal: 98, p: 11, c: 3.4, f: 4.3 },

  // Grains & Cereals
  { id: 'rice_white', name: 'أرز أبيض مطبوخ', name_en: 'White Rice Cooked', unit: 'g', per: 100, kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { id: 'rice_brown', name: 'أرز بني مطبوخ', name_en: 'Brown Rice Cooked', unit: 'g', per: 100, kcal: 111, p: 2.6, c: 23, f: 0.9 },
  { id: 'oats', name: 'شوفان (جاف)', name_en: 'Oats (Dry)', unit: 'g', per: 100, kcal: 389, p: 16.9, c: 66.3, f: 6.9 },
  { id: 'quinoa', name: 'كينوا مطبوخة', name_en: 'Cooked Quinoa', unit: 'g', per: 100, kcal: 120, p: 4.4, c: 21, f: 1.9 },
  { id: 'bread_white', name: 'خبز أبيض', name_en: 'White Bread', unit: 'g', per: 100, kcal: 265, p: 9, c: 49, f: 3.2 },
  { id: 'bread_brown', name: 'خبز بني', name_en: 'Brown Bread', unit: 'g', per: 100, kcal: 247, p: 9.6, c: 41, f: 3.4 },
  { id: 'bread_whole_wheat', name: 'خبز قمح كامل', name_en: 'Whole Wheat Bread', unit: 'g', per: 100, kcal: 247, p: 13, c: 41, f: 3.4 },
  { id: 'pasta_white', name: 'مكرونة مطبوخة', name_en: 'Cooked Pasta', unit: 'g', per: 100, kcal: 131, p: 5, c: 25, f: 1.1 },
  { id: 'pasta_whole_wheat', name: 'مكرونة قمح كامل', name_en: 'Whole Wheat Pasta', unit: 'g', per: 100, kcal: 124, p: 5, c: 25, f: 1.1 },

  // Fruits
  { id: 'banana', name: 'موزة (متوسطة)', name_en: 'Banana (Medium)', unit: 'piece', per: 1, kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { id: 'apple', name: 'تفاحة (متوسطة)', name_en: 'Apple (Medium)', unit: 'piece', per: 1, kcal: 95, p: 0.5, c: 25, f: 0.3 },
  { id: 'orange', name: 'برتقالة (متوسطة)', name_en: 'Orange (Medium)', unit: 'piece', per: 1, kcal: 62, p: 1.2, c: 15.4, f: 0.2 },
  { id: 'strawberries', name: 'فراولة', name_en: 'Strawberries', unit: 'g', per: 100, kcal: 32, p: 0.7, c: 7.7, f: 0.3 },
  { id: 'blueberries', name: 'توت أزرق', name_en: 'Blueberries', unit: 'g', per: 100, kcal: 57, p: 0.7, c: 14, f: 0.3 },
  { id: 'grapes', name: 'عنب', name_en: 'Grapes', unit: 'g', per: 100, kcal: 69, p: 0.7, c: 18, f: 0.2 },
  { id: 'watermelon', name: 'بطيخ', name_en: 'Watermelon', unit: 'g', per: 100, kcal: 30, p: 0.6, c: 8, f: 0.2 },
  { id: 'mango', name: 'مانجو', name_en: 'Mango', unit: 'g', per: 100, kcal: 60, p: 0.8, c: 15, f: 0.4 },
  { id: 'pineapple', name: 'أناناس', name_en: 'Pineapple', unit: 'g', per: 100, kcal: 50, p: 0.5, c: 13, f: 0.1 },
  { id: 'peach', name: 'خوخ', name_en: 'Peach', unit: 'piece', per: 1, kcal: 59, p: 1.4, c: 14, f: 0.4 },

  // Vegetables
  { id: 'broccoli', name: 'بروكلي مطبوخ', name_en: 'Cooked Broccoli', unit: 'g', per: 100, kcal: 55, p: 3.7, c: 11, f: 0.6 },
  { id: 'spinach', name: 'سبانخ مطبوخة', name_en: 'Cooked Spinach', unit: 'g', per: 100, kcal: 23, p: 3, c: 3.6, f: 0.3 },
  { id: 'tomato', name: 'طماطم', name_en: 'Tomato', unit: 'g', per: 100, kcal: 18, p: 0.9, c: 3.9, f: 0.2 },
  { id: 'cucumber', name: 'خيار', name_en: 'Cucumber', unit: 'g', per: 100, kcal: 15, p: 0.7, c: 3.6, f: 0.1 },
  { id: 'lettuce', name: 'خس', name_en: 'Lettuce', unit: 'g', per: 100, kcal: 15, p: 1.4, c: 2.9, f: 0.2 },
  { id: 'onion', name: 'بصل', name_en: 'Onion', unit: 'g', per: 100, kcal: 40, p: 1.1, c: 9.3, f: 0.1 },
  { id: 'garlic', name: 'ثوم', name_en: 'Garlic', unit: 'g', per: 100, kcal: 149, p: 6.4, c: 33, f: 0.5 },
  { id: 'carrot', name: 'جزر', name_en: 'Carrot', unit: 'g', per: 100, kcal: 41, p: 0.9, c: 10, f: 0.2 },
  { id: 'bell_pepper', name: 'فلفل رومي', name_en: 'Bell Pepper', unit: 'g', per: 100, kcal: 31, p: 1, c: 6, f: 0.3 },
  { id: 'mushrooms', name: 'مشروم', name_en: 'Mushrooms', unit: 'g', per: 100, kcal: 22, p: 3.1, c: 3.3, f: 0.3 },

  // Starchy Vegetables
  { id: 'sweet_potato', name: 'بطاطا حلوة', name_en: 'Sweet Potato', unit: 'g', per: 100, kcal: 86, p: 1.6, c: 20, f: 0.1 },
  { id: 'potato', name: 'بطاطس مسلوقة', name_en: 'Boiled Potato', unit: 'g', per: 100, kcal: 87, p: 2, c: 20, f: 0.1 },
  { id: 'corn', name: 'ذرة مطبوخة', name_en: 'Cooked Corn', unit: 'g', per: 100, kcal: 96, p: 3.4, c: 21, f: 1.5 },

  // Legumes
  { id: 'beans_black', name: 'فاصوليا سوداء مطبوخة', name_en: 'Cooked Black Beans', unit: 'g', per: 100, kcal: 132, p: 8.9, c: 23.7, f: 0.5 },
  { id: 'beans_kidney', name: 'فاصوليا حمراء', name_en: 'Kidney Beans', unit: 'g', per: 100, kcal: 127, p: 8.7, c: 22.8, f: 0.5 },
  { id: 'lentils', name: 'عدس مطبوخ', name_en: 'Cooked Lentils', unit: 'g', per: 100, kcal: 116, p: 9, c: 20, f: 0.4 },
  { id: 'chickpeas', name: 'حمص مطبوخ', name_en: 'Cooked Chickpeas', unit: 'g', per: 100, kcal: 164, p: 9, c: 27, f: 2.6 },
  { id: 'soybeans', name: 'فول الصويا', name_en: 'Soybeans', unit: 'g', per: 100, kcal: 173, p: 17, c: 10, f: 9 },

  // Nuts & Seeds
  { id: 'almonds', name: 'لوز', name_en: 'Almonds', unit: 'g', per: 100, kcal: 579, p: 21, c: 22, f: 50 },
  { id: 'walnuts', name: 'عين جمل', name_en: 'Walnuts', unit: 'g', per: 100, kcal: 654, p: 15, c: 14, f: 65 },
  { id: 'cashews', name: 'كاجو', name_en: 'Cashews', unit: 'g', per: 100, kcal: 553, p: 18, c: 30, f: 44 },
  { id: 'peanuts', name: 'فول سوداني', name_en: 'Peanuts', unit: 'g', per: 100, kcal: 567, p: 26, c: 16, f: 49 },
  { id: 'peanut_butter', name: 'زبدة فول سوداني', name_en: 'Peanut Butter', unit: 'g', per: 100, kcal: 588, p: 25, c: 20, f: 50 },
  { id: 'sunflower_seeds', name: 'بذور دوار الشمس', name_en: 'Sunflower Seeds', unit: 'g', per: 100, kcal: 584, p: 21, c: 20, f: 51 },
  { id: 'chia_seeds', name: 'بذور الشيا', name_en: 'Chia Seeds', unit: 'g', per: 100, kcal: 486, p: 17, c: 42, f: 31 },

  // Oils & Fats
  { id: 'olive_oil', name: 'زيت زيتون', name_en: 'Olive Oil', unit: 'g', per: 100, kcal: 884, p: 0, c: 0, f: 100 },
  { id: 'butter', name: 'زبدة', name_en: 'Butter', unit: 'g', per: 100, kcal: 717, p: 0.9, c: 0.1, f: 81 },
  { id: 'coconut_oil', name: 'زيت جوز الهند', name_en: 'Coconut Oil', unit: 'g', per: 100, kcal: 862, p: 0, c: 0, f: 100 },
  { id: 'avocado_oil', name: 'زيت أفوكادو', name_en: 'Avocado Oil', unit: 'g', per: 100, kcal: 884, p: 0, c: 0, f: 100 },

  // Sweeteners
  { id: 'honey', name: 'عسل نحل', name_en: 'Honey', unit: 'g', per: 100, kcal: 304, p: 0.3, c: 82, f: 0 },
  { id: 'sugar_white', name: 'سكر أبيض', name_en: 'White Sugar', unit: 'g', per: 100, kcal: 387, p: 0, c: 100, f: 0 },
  { id: 'maple_syrup', name: 'شراب القيقب', name_en: 'Maple Syrup', unit: 'g', per: 100, kcal: 260, p: 0, c: 67, f: 0 },

  // Beverages
  { id: 'apple_juice', name: 'عصير تفاح', name_en: 'Apple Juice', unit: 'ml', per: 100, kcal: 46, p: 0.1, c: 11, f: 0.1 },
  { id: 'orange_juice', name: 'عصير برتقال', name_en: 'Orange Juice', unit: 'ml', per: 100, kcal: 45, p: 0.7, c: 10, f: 0.2 },
  { id: 'coffee_black', name: 'قهوة سادة', name_en: 'Black Coffee', unit: 'ml', per: 100, kcal: 2, p: 0.3, c: 0, f: 0 },
  { id: 'tea_black', name: 'شاي سادة', name_en: 'Black Tea', unit: 'ml', per: 100, kcal: 1, p: 0, c: 0, f: 0 },
  { id: 'green_tea', name: 'شاي أخضر', name_en: 'Green Tea', unit: 'ml', per: 100, kcal: 1, p: 0, c: 0, f: 0 },
  { id: 'water', name: 'ماء', name_en: 'Water', unit: 'ml', per: 100, kcal: 0, p: 0, c: 0, f: 0 },

  // Miscellaneous
  { id: 'avocado', name: 'أفوكادو', name_en: 'Avocado', unit: 'g', per: 100, kcal: 160, p: 2, c: 9, f: 15 },
  { id: 'dates', name: 'تمر', name_en: 'Dates', unit: 'g', per: 100, kcal: 277, p: 2, c: 75, f: 0.2 },
  { id: 'dark_chocolate', name: 'شوكولاتة داكنة', name_en: 'Dark Chocolate', unit: 'g', per: 100, kcal: 546, p: 4.9, c: 61, f: 31 },
  { id: 'milk_chocolate', name: 'شوكولاتة بالحليب', name_en: 'Milk Chocolate', unit: 'g', per: 100, kcal: 535, p: 7.7, c: 59, f: 30 },
  { id: 'tofu', name: 'توفو', name_en: 'Tofu', unit: 'g', per: 100, kcal: 76, p: 8, c: 2, f: 4.8 },
  { id: 'tempeh', name: 'تمبه', name_en: 'Tempeh', unit: 'g', per: 100, kcal: 193, p: 19, c: 9, f: 11 },

  // Fast Food & Processed
  { id: 'pizza_cheese', name: 'بيتزا جبن', name_en: 'Cheese Pizza', unit: 'g', per: 100, kcal: 266, p: 11, c: 33, f: 10 },
  { id: 'burger_cheese', name: 'برجر بالجبن', name_en: 'Cheeseburger', unit: 'piece', per: 1, kcal: 303, p: 15, c: 30, f: 13 },
  { id: 'french_fries', name: 'بطاطس مقلية', name_en: 'French Fries', unit: 'g', per: 100, kcal: 312, p: 3.4, c: 41, f: 15 },
  { id: 'fried_chicken', name: 'دجاج مقلي', name_en: 'Fried Chicken', unit: 'g', per: 100, kcal: 246, p: 23, c: 9, f: 13 },

  // Traditional Arabic Foods
  { id: 'hummus', name: 'حمص بالطحينة', name_en: 'Hummus', unit: 'g', per: 100, kcal: 177, p: 8, c: 20, f: 8 },
  { id: 'falafel', name: 'فلافل', name_en: 'Falafel', unit: 'piece', per: 1, kcal: 57, p: 2, c: 5, f: 3 },
  { id: 'foul_medames', name: 'فول مدمس', name_en: 'Foul Medames', unit: 'g', per: 100, kcal: 127, p: 7, c: 19, f: 3 },
  { id: 'tahini', name: 'طحينة', name_en: 'Tahini', unit: 'g', per: 100, kcal: 595, p: 17, c: 21, f: 51 },
  { id: 'labneh', name: 'لبنة', name_en: 'Labneh', unit: 'g', per: 100, kcal: 110, p: 7, c: 4, f: 8 },
  { id: 'pita_bread', name: 'خبز عربي', name_en: 'Pita Bread', unit: 'piece', per: 1, kcal: 165, p: 6, c: 33, f: 1 },
  { id: 'kabsa', name: 'كبسة', name_en: 'Kabsa', unit: 'g', per: 100, kcal: 180, p: 12, c: 20, f: 6 },
  { id: 'mansaf', name: 'منسف', name_en: 'Mansaf', unit: 'g', per: 100, kcal: 220, p: 15, c: 18, f: 10 },

  // Meat & Poultry (Additional)
  { id: 'beef_liver', name: 'كبد بقري', name_en: 'Beef Liver', unit: 'g', per: 100, kcal: 135, p: 20, c: 3, f: 4 },
  { id: 'chicken_liver', name: 'كبد فراخ', name_en: 'Chicken Liver', unit: 'g', per: 100, kcal: 167, p: 24, c: 1, f: 6.5 },
  { id: 'beef_sirloin', name: 'لحم سرلوين', name_en: 'Beef Sirloin', unit: 'g', per: 100, kcal: 205, p: 25, c: 0, f: 12 },
  { id: 'veal', name: 'لحم عجل', name_en: 'Veal', unit: 'g', per: 100, kcal: 172, p: 24, c: 0, f: 8 },
  { id: 'bacon', name: 'لحم مقدد', name_en: 'Bacon', unit: 'g', per: 100, kcal: 541, p: 37, c: 1.4, f: 42 },
  { id: 'sausage_beef', name: 'سجق لحم', name_en: 'Beef Sausage', unit: 'g', per: 100, kcal: 332, p: 14, c: 3, f: 29 },

  // Fish & Seafood (Additional)
  { id: 'mackerel', name: 'أسقمري', name_en: 'Mackerel', unit: 'g', per: 100, kcal: 262, p: 19, c: 0, f: 21 },
  { id: 'herring', name: 'رنجة', name_en: 'Herring', unit: 'g', per: 100, kcal: 158, p: 18, c: 0, f: 9 },
  { id: 'trout', name: 'تراوت', name_en: 'Trout', unit: 'g', per: 100, kcal: 148, p: 21, c: 0, f: 6.6 },
  { id: 'tilapia', name: 'بلطي', name_en: 'Tilapia', unit: 'g', per: 100, kcal: 96, p: 20, c: 0, f: 1.7 },
  { id: 'octopus', name: 'أخطبوط', name_en: 'Octopus', unit: 'g', per: 100, kcal: 82, p: 15, c: 2.2, f: 1 },
  { id: 'squid', name: 'كاليماري', name_en: 'Squid', unit: 'g', per: 100, kcal: 92, p: 16, c: 3.1, f: 1.4 },
  { id: 'clams', name: 'محار', name_en: 'Clams', unit: 'g', per: 100, kcal: 74, p: 13, c: 2.6, f: 1 },

  // Dairy & Alternatives (Additional)
  { id: 'buttermilk', name: 'لبن رائب', name_en: 'Buttermilk', unit: 'ml', per: 100, kcal: 41, p: 3.3, c: 4.8, f: 0.9 },
  { id: 'sour_cream', name: 'قشدة حامضة', name_en: 'Sour Cream', unit: 'g', per: 100, kcal: 198, p: 2.1, c: 4.6, f: 19 },
  { id: 'cream_cheese', name: 'جبنة كريمية', name_en: 'Cream Cheese', unit: 'g', per: 100, kcal: 342, p: 6, c: 4.1, f: 34 },
  { id: 'goat_cheese', name: 'جبنة ماعز', name_en: 'Goat Cheese', unit: 'g', per: 100, kcal: 364, p: 22, c: 2.5, f: 30 },
  { id: 'parmesan', name: 'جبنة بارميزان', name_en: 'Parmesan Cheese', unit: 'g', per: 100, kcal: 431, p: 38, c: 4.1, f: 29 },
  { id: 'swiss_cheese', name: 'جبنة سويسرية', name_en: 'Swiss Cheese', unit: 'g', per: 100, kcal: 380, p: 27, c: 5, f: 28 },
  { id: 'provolone', name: 'جبنة بروفولوني', name_en: 'Provolone Cheese', unit: 'g', per: 100, kcal: 351, p: 26, c: 2.1, f: 27 },

  // Plant-Based Milks
  { id: 'almond_milk', name: 'حليب لوز', name_en: 'Almond Milk', unit: 'ml', per: 100, kcal: 17, p: 0.6, c: 0.6, f: 1.5 },
  { id: 'soy_milk', name: 'حليب صويا', name_en: 'Soy Milk', unit: 'ml', per: 100, kcal: 54, p: 3.3, c: 6, f: 1.8 },
  { id: 'oat_milk', name: 'حليب شوفان', name_en: 'Oat Milk', unit: 'ml', per: 100, kcal: 46, p: 0.8, c: 7, f: 1.5 },
  { id: 'coconut_milk', name: 'حليب جوز الهند', name_en: 'Coconut Milk', unit: 'ml', per: 100, kcal: 230, p: 2.3, c: 3.3, f: 24 },

  // Grains & Cereals (Additional)
  { id: 'barley', name: 'شعير', name_en: 'Barley', unit: 'g', per: 100, kcal: 123, p: 2.3, c: 28, f: 0.4 },
  { id: 'buckwheat', name: 'حنطة سوداء', name_en: 'Buckwheat', unit: 'g', per: 100, kcal: 343, p: 13, c: 72, f: 3.4 },
  { id: 'millet', name: 'دخن', name_en: 'Millet', unit: 'g', per: 100, kcal: 119, p: 3.5, c: 23.7, f: 1 },
  { id: 'bulgur', name: 'برغل', name_en: 'Bulgur', unit: 'g', per: 100, kcal: 83, p: 3.1, c: 18.6, f: 0.2 },
  { id: 'couscous', name: 'كسكس', name_en: 'Couscous', unit: 'g', per: 100, kcal: 112, p: 3.8, c: 23.2, f: 0.2 },
  { id: 'rye_bread', name: 'خبز الجاودار', name_en: 'Rye Bread', unit: 'g', per: 100, kcal: 259, p: 8.5, c: 48, f: 3.3 },

  // Fruits (Additional)
  { id: 'pear', name: 'كمثرى', name_en: 'Pear', unit: 'piece', per: 1, kcal: 101, p: 0.6, c: 27, f: 0.2 },
  { id: 'plum', name: 'برقوق', name_en: 'Plum', unit: 'piece', per: 1, kcal: 30, p: 0.5, c: 7.5, f: 0.2 },
  { id: 'apricot', name: 'مشمش', name_en: 'Apricot', unit: 'piece', per: 1, kcal: 17, p: 0.5, c: 3.9, f: 0.1 },
  { id: 'cherries', name: 'كرز', name_en: 'Cherries', unit: 'g', per: 100, kcal: 50, p: 1, c: 12, f: 0.3 },
  { id: 'figs', name: 'تين', name_en: 'Figs', unit: 'piece', per: 1, kcal: 37, p: 0.4, c: 9.6, f: 0.1 },
  { id: 'pomegranate', name: 'رمان', name_en: 'Pomegranate', unit: 'g', per: 100, kcal: 83, p: 1.7, c: 19, f: 1.2 },
  { id: 'kiwi', name: 'كيوي', name_en: 'Kiwi', unit: 'piece', per: 1, kcal: 42, p: 0.8, c: 10, f: 0.4 },
  { id: 'papaya', name: 'بابايا', name_en: 'Papaya', unit: 'g', per: 100, kcal: 43, p: 0.5, c: 11, f: 0.3 },
  { id: 'cantaloupe', name: 'كانتالوب', name_en: 'Cantaloupe', unit: 'g', per: 100, kcal: 34, p: 0.8, c: 8, f: 0.2 },

  // Vegetables (Additional)
  { id: 'cauliflower', name: 'قرنبيط', name_en: 'Cauliflower', unit: 'g', per: 100, kcal: 25, p: 2, c: 5, f: 0.3 },
  { id: 'cabbage', name: 'ملفوف', name_en: 'Cabbage', unit: 'g', per: 100, kcal: 25, p: 1.3, c: 5.8, f: 0.1 },
  { id: 'brussels_sprouts', name: 'كرنب بروكسل', name_en: 'Brussels Sprouts', unit: 'g', per: 100, kcal: 43, p: 3.4, c: 9, f: 0.3 },
  { id: 'asparagus', name: 'هليون', name_en: 'Asparagus', unit: 'g', per: 100, kcal: 20, p: 2.2, c: 3.9, f: 0.1 },
  { id: 'artichoke', name: 'خرشوف', name_en: 'Artichoke', unit: 'g', per: 100, kcal: 47, p: 3.3, c: 10.5, f: 0.2 },
  { id: 'eggplant', name: 'باذنجان', name_en: 'Eggplant', unit: 'g', per: 100, kcal: 25, p: 1, c: 6, f: 0.2 },
  { id: 'zucchini', name: 'كوسة', name_en: 'Zucchini', unit: 'g', per: 100, kcal: 17, p: 1.2, c: 3.1, f: 0.3 },
  { id: 'pumpkin', name: 'قرع', name_en: 'Pumpkin', unit: 'g', per: 100, kcal: 26, p: 1, c: 6.5, f: 0.1 },
  { id: 'radish', name: 'فجل', name_en: 'Radish', unit: 'g', per: 100, kcal: 16, p: 0.7, c: 3.4, f: 0.1 },
  { id: 'celery', name: 'كرفس', name_en: 'Celery', unit: 'g', per: 100, kcal: 14, p: 0.7, c: 3, f: 0.2 },

  // Legumes (Additional)
  { id: 'beans_pinto', name: 'فاصوليا بينتو', name_en: 'Pinto Beans', unit: 'g', per: 100, kcal: 143, p: 9, c: 26, f: 0.6 },
  { id: 'beans_navy', name: 'فاصوليا نافي', name_en: 'Navy Beans', unit: 'g', per: 100, kcal: 140, p: 8, c: 26, f: 0.6 },
  { id: 'beans_garbanzo', name: 'حمص', name_en: 'Garbanzo Beans', unit: 'g', per: 100, kcal: 139, p: 7, c: 22, f: 2.1 },
  { id: 'split_peas', name: 'بازلاء مجزأة', name_en: 'Split Peas', unit: 'g', per: 100, kcal: 118, p: 8, c: 21, f: 0.4 },

  // Nuts & Seeds (Additional)
  { id: 'pecans', name: 'بيكان', name_en: 'Pecans', unit: 'g', per: 100, kcal: 691, p: 9, c: 14, f: 72 },
  { id: 'pistachios', name: 'فستق', name_en: 'Pistachios', unit: 'g', per: 100, kcal: 562, p: 20, c: 28, f: 45 },
  { id: 'macadamia', name: 'مكاديميا', name_en: 'Macadamia Nuts', unit: 'g', per: 100, kcal: 718, p: 8, c: 14, f: 76 },
  { id: 'hazelnuts', name: 'بندق', name_en: 'Hazelnuts', unit: 'g', per: 100, kcal: 628, p: 15, c: 17, f: 61 },
  { id: 'pine_nuts', name: 'صنوبر', name_en: 'Pine Nuts', unit: 'g', per: 100, kcal: 673, p: 14, c: 13, f: 68 },
  { id: 'pumpkin_seeds', name: 'بذور قرع', name_en: 'Pumpkin Seeds', unit: 'g', per: 100, kcal: 559, p: 30, c: 11, f: 49 },
  { id: 'flax_seeds', name: 'بذور الكتان', name_en: 'Flax Seeds', unit: 'g', per: 100, kcal: 534, p: 18, c: 29, f: 42 },
  { id: 'sesame_seeds', name: 'سمسم', name_en: 'Sesame Seeds', unit: 'g', per: 100, kcal: 573, p: 18, c: 23, f: 50 },

  // Oils & Fats (Additional)
  { id: 'canola_oil', name: 'زيت كانولا', name_en: 'Canola Oil', unit: 'g', per: 100, kcal: 884, p: 0, c: 0, f: 100 },
  { id: 'sunflower_oil', name: 'زيت دوار الشمس', name_en: 'Sunflower Oil', unit: 'g', per: 100, kcal: 884, p: 0, c: 0, f: 100 },
  { id: 'corn_oil', name: 'زيت ذرة', name_en: 'Corn Oil', unit: 'g', per: 100, kcal: 884, p: 0, c: 0, f: 100 },
  { id: 'soybean_oil', name: 'زيت صويا', name_en: 'Soybean Oil', unit: 'g', per: 100, kcal: 884, p: 0, c: 0, f: 100 },
  { id: 'ghee', name: 'سمن بلدي', name_en: 'Ghee', unit: 'g', per: 100, kcal: 900, p: 0, c: 0, f: 100 },
  { id: 'lard', name: 'شحم الخنزير', name_en: 'Lard', unit: 'g', per: 100, kcal: 902, p: 0, c: 0, f: 100 },

  // Beverages (Additional)
  { id: 'cola', name: 'كولا', name_en: 'Cola', unit: 'ml', per: 100, kcal: 41, p: 0, c: 10.6, f: 0 },
  { id: 'lemonade', name: 'ليمونادة', name_en: 'Lemonade', unit: 'ml', per: 100, kcal: 40, p: 0, c: 10, f: 0 },
  { id: 'sports_drink', name: 'مشروب رياضي', name_en: 'Sports Drink', unit: 'ml', per: 100, kcal: 24, p: 0, c: 6, f: 0 },
  { id: 'energy_drink', name: 'مشروب طاقة', name_en: 'Energy Drink', unit: 'ml', per: 100, kcal: 45, p: 0, c: 11, f: 0 },
  { id: 'beer', name: 'بيرة', name_en: 'Beer', unit: 'ml', per: 100, kcal: 43, p: 0.5, c: 3.6, f: 0 },
  { id: 'wine_red', name: 'نبيذ أحمر', name_en: 'Red Wine', unit: 'ml', per: 100, kcal: 85, p: 0.1, c: 2.6, f: 0 },
  { id: 'wine_white', name: 'نبيذ أبيض', name_en: 'White Wine', unit: 'ml', per: 100, kcal: 82, p: 0.1, c: 2.6, f: 0 },

  // Herbs & Spices
  { id: 'basil', name: 'ريحان', name_en: 'Basil', unit: 'g', per: 100, kcal: 44, p: 3.2, c: 8, f: 0.6 },
  { id: 'parsley', name: 'بقدونس', name_en: 'Parsley', unit: 'g', per: 100, kcal: 36, p: 3, c: 6.3, f: 0.8 },
  { id: 'cinnamon', name: 'قرفة', name_en: 'Cinnamon', unit: 'g', per: 100, kcal: 247, p: 4, c: 81, f: 1.2 },
  { id: 'turmeric', name: 'كركم', name_en: 'Turmeric', unit: 'g', per: 100, kcal: 354, p: 7.8, c: 65, f: 9.9 },
  { id: 'ginger', name: 'زنجبيل', name_en: 'Ginger', unit: 'g', per: 100, kcal: 80, p: 1.8, c: 18, f: 0.8 },
  { id: 'cumin', name: 'كمون', name_en: 'Cumin', unit: 'g', per: 100, kcal: 375, p: 18, c: 44, f: 22 },

  // Condiments & Sauces
  { id: 'ketchup', name: 'كاتشب', name_en: 'Ketchup', unit: 'g', per: 100, kcal: 101, p: 1, c: 25, f: 0.3 },
  { id: 'mayonnaise', name: 'مايونيز', name_en: 'Mayonnaise', unit: 'g', per: 100, kcal: 700, p: 1, c: 1.5, f: 77 },
  { id: 'mustard', name: 'خردل', name_en: 'Mustard', unit: 'g', per: 100, kcal: 66, p: 4.4, c: 5.8, f: 3.3 },
  { id: 'soy_sauce', name: 'صلصة الصويا', name_en: 'Soy Sauce', unit: 'g', per: 100, kcal: 53, p: 8, c: 4.9, f: 0.1 },
  { id: 'hot_sauce', name: 'صلصة حارة', name_en: 'Hot Sauce', unit: 'g', per: 100, kcal: 36, p: 1.3, c: 7.2, f: 0.6 },

  // Snacks & Sweets
  { id: 'potato_chips', name: 'شيبس', name_en: 'Potato Chips', unit: 'g', per: 100, kcal: 536, p: 7, c: 53, f: 35 },
  { id: 'popcorn', name: 'فشار', name_en: 'Popcorn', unit: 'g', per: 100, kcal: 387, p: 13, c: 78, f: 5 },
  { id: 'pretzels', name: 'بريتزل', name_en: 'Pretzels', unit: 'g', per: 100, kcal: 380, p: 9, c: 80, f: 4 },
  { id: 'cookies_chocolate_chip', name: 'بسكويت شوكولاتة', name_en: 'Chocolate Chip Cookies', unit: 'g', per: 100, kcal: 488, p: 5, c: 68, f: 22 },
  { id: 'cake_chocolate', name: 'كيك شوكولاتة', name_en: 'Chocolate Cake', unit: 'g', per: 100, kcal: 371, p: 5, c: 53, f: 16 },
  { id: 'ice_cream_vanilla', name: 'آيس كريم فانيليا', name_en: 'Vanilla Ice Cream', unit: 'g', per: 100, kcal: 207, p: 3.5, c: 24, f: 11 },
  { id: 'gelatin', name: 'جيلاتين', name_en: 'Gelatin', unit: 'g', per: 100, kcal: 62, p: 14, c: 0, f: 0.1 },

  // Baby Foods
  { id: 'baby_rice_cereal', name: 'حبوب أرز للأطفال', name_en: 'Baby Rice Cereal', unit: 'g', per: 100, kcal: 400, p: 6, c: 87, f: 1 },
  { id: 'baby_apple_sauce', name: 'صلصة تفاح للأطفال', name_en: 'Baby Apple Sauce', unit: 'g', per: 100, kcal: 41, p: 0.2, c: 11, f: 0.1 },

  // Nutritional Supplements
  { id: 'whey_protein', name: 'بروتين مصل اللبن', name_en: 'Whey Protein', unit: 'g', per: 100, kcal: 405, p: 78, c: 7, f: 6 },
  { id: 'casein_protein', name: 'بروتين كازين', name_en: 'Casein Protein', unit: 'g', per: 100, kcal: 380, p: 80, c: 4, f: 3 },
  { id: 'bcaa', name: 'أحماض أمينية متفرعة السلسلة', name_en: 'BCAA', unit: 'g', per: 100, kcal: 400, p: 100, c: 0, f: 0 },
  { id: 'creatine', name: 'كرياتين', name_en: 'Creatine', unit: 'g', per: 100, kcal: 0, p: 0, c: 0, f: 0 },

  // International Cuisine
  { id: 'sushi_salmon', name: 'سوشي سلمون', name_en: 'Salmon Sushi', unit: 'piece', per: 1, kcal: 45, p: 3, c: 7, f: 1 },
  { id: 'sashimi', name: 'ساشيمي', name_en: 'Sashimi', unit: 'g', per: 100, kcal: 130, p: 20, c: 0, f: 5 },
  { id: 'pad_thai', name: 'باد تاي', name_en: 'Pad Thai', unit: 'g', per: 100, kcal: 180, p: 8, c: 25, f: 6 },
  { id: 'curry_chicken', name: 'كاري دجاج', name_en: 'Chicken Curry', unit: 'g', per: 100, kcal: 150, p: 12, c: 8, f: 8 },
  { id: 'tacos_beef', name: 'تاكوس لحم', name_en: 'Beef Tacos', unit: 'piece', per: 1, kcal: 170, p: 8, c: 13, f: 9 },
  { id: 'burrito', name: 'بوريتو', name_en: 'Burrito', unit: 'piece', per: 1, kcal: 300, p: 15, c: 35, f: 10 },

  // Middle Eastern Specialties
  { id: 'shawarma_chicken', name: 'شاورما دجاج', name_en: 'Chicken Shawarma', unit: 'g', per: 100, kcal: 165, p: 16, c: 8, f: 8 },
  { id: 'kofta', name: 'كفتة', name_en: 'Kofta', unit: 'g', per: 100, kcal: 220, p: 18, c: 3, f: 15 },
  { id: 'baba_ghanoush', name: 'بابا غنوج', name_en: 'Baba Ghanoush', unit: 'g', per: 100, kcal: 130, p: 2, c: 8, f: 10 },
  { id: 'tabbouleh', name: 'تبولة', name_en: 'Tabbouleh', unit: 'g', per: 100, kcal: 45, p: 2, c: 8, f: 1 },
  { id: 'fattoush', name: 'فتوش', name_en: 'Fattoush', unit: 'g', per: 100, kcal: 60, p: 2, c: 7, f: 3 },
  { id: 'kunafa', name: 'كنافة', name_en: 'Kunafa', unit: 'g', per: 100, kcal: 320, p: 6, c: 45, f: 14 },
  { id: 'baklava', name: 'بقلاوة', name_en: 'Baklava', unit: 'g', per: 100, kcal: 430, p: 7, c: 52, f: 22 },
  { id: 'maamoul', name: 'معمول', name_en: 'Maamoul', unit: 'piece', per: 1, kcal: 120, p: 2, c: 15, f: 6 },

  // Frozen Foods
  { id: 'frozen_pizza', name: 'بيتزا مجمدة', name_en: 'Frozen Pizza', unit: 'g', per: 100, kcal: 260, p: 11, c: 32, f: 10 },
  { id: 'frozen_vegetables_mix', name: 'خضروات مجمدة', name_en: 'Frozen Mixed Vegetables', unit: 'g', per: 100, kcal: 64, p: 3, c: 13, f: 0.4 },
  { id: 'frozen_fish_fillet', name: 'فيليه سمك مجمد', name_en: 'Frozen Fish Fillet', unit: 'g', per: 100, kcal: 120, p: 16, c: 6, f: 4 },

  // Canned Foods
  { id: 'canned_tuna_oil', name: 'تونة بالزيت', name_en: 'Tuna in Oil', unit: 'g', per: 100, kcal: 198, p: 29, c: 0, f: 8 },
  { id: 'canned_sardines', name: 'سردين معلب', name_en: 'Canned Sardines', unit: 'g', per: 100, kcal: 208, p: 25, c: 0, f: 11 },
  { id: 'canned_corn', name: 'ذرة معلبة', name_en: 'Canned Corn', unit: 'g', per: 100, kcal: 86, p: 2.5, c: 19, f: 1.2 },
  { id: 'canned_beans', name: 'فاصوليا معلبة', name_en: 'Canned Beans', unit: 'g', per: 100, kcal: 94, p: 6, c: 17, f: 0.5 },

  // Breakfast Foods
  { id: 'pancakes', name: 'بان كيك', name_en: 'Pancakes', unit: 'piece', per: 1, kcal: 90, p: 3, c: 15, f: 2 },
  { id: 'waffles', name: 'وافل', name_en: 'Waffles', unit: 'piece', per: 1, kcal: 120, p: 4, c: 18, f: 4 },
  { id: 'french_toast', name: 'خبز فرنسي محمص', name_en: 'French Toast', unit: 'piece', per: 1, kcal: 150, p: 6, c: 16, f: 7 },
  { id: 'cereal_corn_flakes', name: 'رقائق الذرة', name_en: 'Corn Flakes', unit: 'g', per: 100, kcal: 379, p: 7, c: 87, f: 0.6 },
  { id: 'cereal_oat', name: 'رقائق الشوفان', name_en: 'Oat Cereal', unit: 'g', per: 100, kcal: 379, p: 10, c: 73, f: 6 },

  // Desserts & Pastries
  { id: 'cheesecake', name: 'تشيز كيك', name_en: 'Cheesecake', unit: 'g', per: 100, kcal: 321, p: 5.5, c: 25, f: 23 },
  { id: 'tiramisu', name: 'تيراميسو', name_en: 'Tiramisu', unit: 'g', per: 100, kcal: 240, p: 5, c: 25, f: 13 },
  { id: 'croissant', name: 'كرواسون', name_en: 'Croissant', unit: 'piece', per: 1, kcal: 231, p: 5, c: 26, f: 12 },
  { id: 'doughnut', name: 'دونات', name_en: 'Doughnut', unit: 'piece', per: 1, kcal: 195, p: 3, c: 22, f: 11 },
  { id: 'muffin_blueberry', name: 'مافن توت', name_en: 'Blueberry Muffin', unit: 'piece', per: 1, kcal: 265, p: 4, c: 40, f: 10 },

  // Soups
  { id: 'chicken_soup', name: 'شوربة دجاج', name_en: 'Chicken Soup', unit: 'g', per: 100, kcal: 45, p: 4, c: 4, f: 2 },
  { id: 'tomato_soup', name: 'شوربة طماطم', name_en: 'Tomato Soup', unit: 'g', per: 100, kcal: 40, p: 1, c: 7, f: 1 },
  { id: 'lentil_soup', name: 'شوربة عدس', name_en: 'Lentil Soup', unit: 'g', per: 100, kcal: 75, p: 5, c: 12, f: 1.5 },
  { id: 'vegetable_soup', name: 'شوربة خضار', name_en: 'Vegetable Soup', unit: 'g', per: 100, kcal: 35, p: 2, c: 6, f: 0.5 },
];
