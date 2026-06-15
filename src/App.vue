<template>
  <RouterView />
  <ToastContainer />
</template>

<script setup lang="ts">
import { provideToast } from '@/composables/useToast'
import ToastContainer from '@/components/ToastContainer.vue'

provideToast()
</script>
