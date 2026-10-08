<template>
  <footer>
    <v-container class="footer-content px-5 px-md-8">
      <span>© 2026 CowCare AI · Heat Stress Intelligence for Dairy Farms</span>
      <span class="d-none d-sm-inline">IoT ที่ออกแบบเพื่อเกษตรกรรายย่อย</span>
    </v-container>
  </footer>
</template>

<style scoped>
footer {
  padding: 25px 0;
  color: #a8b6aa;
  background: #19362e;
  font-size: .65rem;
  text-align: center;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

@media (max-width: 600px) {
  .footer-content {
    flex-direction: column;
    justify-content: center;
  }
}
</style>
