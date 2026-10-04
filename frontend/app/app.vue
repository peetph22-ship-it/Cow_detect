<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage/>
    </NuxtLayout>
  </v-app>
</template>

<style>
/* Thai Font */
@font-face {
  font-family: 'Thai'; /* ตั้งชื่อฟอนต์เองได้เลย */
  /* เรียกพาทไฟล์ฟอนต์ ห้ามมี public นำหน้านะครับ */
  src: url('/fonts/NotoSerifThai-VariableFont_wdth,wght.ttf') format('truetype');
  /* font-weight: normal;
  font-style: normal; */
}

/* Eng Font */
@font-face {
  font-family: 'Eng'; /* ตั้งชื่อฟอนต์เองได้เลย */
  /* เรียกพาทไฟล์ฟอนต์ ห้ามมี public นำหน้านะครับ */
  src: url('/fonts/LibreCaslonCondensed-Medium.ttf') format('truetype');
  /* font-weight: normal;
  font-style: normal; */
}


/* 2. สั่งให้ทั้งเว็บเปลี่ยนมาใช้ฟอนต์ชื่อ MyCustomFont */
body, .v-application {
  /* ถ้าเจอภาษาอังกฤษ ใช้ MyEnglishFont... ถ้าตัวไหนไม่มี (เช่นภาษาไทย) ค่อยไปใช้ MyThaiFont */
  font-family: 'Eng', 'Thai', sans-serif !important;
}

h1, h2, h3, h4, h5, h6, .text-h1, .text-h2, .text-h3, .text-h4, .text-h5, .text-h6 {
  font-family: 'MyEnglishFont', 'MyThaiFont', sans-serif !important;
}

</style>