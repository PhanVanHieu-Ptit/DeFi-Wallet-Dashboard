<template>
  <RouterView />
  <ToastContainer />
  <BottomNav />
</template>

<script setup lang="ts">
import ToastContainer from '@/components/ToastContainer.vue'
import BottomNav from '@/components/BottomNav.vue'
</script>
