export const swiperSettings = {
  navigation: { prevEl: ".cards-prev2", nextEl: ".cards-next2" },
  pagination: {
    el: ".cards-pagination",
    clickable: true,
    bulletClass: "cards-bullet",
    bulletActiveClass: "cards-bullet-active",
    renderBullet: (_i, className) =>
      `<span class="${className}"><span class="inner"></span></span>`,
  },
  spaceBetween: 20,
  loop: true,  
  slidesPerView: 2,
  breakpoints: {
    940: { slidesPerView: 2 },
    380: { slidesPerView: 1 },
  },
};


export const swiperSettingsExplore = {
  navigation: { prevEl: ".cards-prev2", nextEl: ".cards-next2" },
  pagination: {
    el: ".cards-pagination",
    clickable: true,
    bulletClass: "cards-bullet",
    bulletActiveClass: "cards-bullet-active",
    renderBullet: (_i, className) =>
      `<span class="${className}"><span class="inner"></span></span>`,
  },
    loop: true,  

  spaceBetween: 10,
  slidesPerView: "auto",  
  breakpoints: {
    380: { slidesPerView: 1 },   // phones
    640: { slidesPerView: 2 },   // tablets
    940: { slidesPerView: 3 },   // small laptops
    1280: { slidesPerView: 4 },  // desktops
  },
};