<script setup lang="ts">
import { sessions } from '~/data/sessions'
</script>

<template>
  <div class="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <LandingSessionCard
      v-for="session in sessions"
      :key="session.id"
      :session="session"
    />
  </div>
</template>
