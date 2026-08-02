<script setup lang="ts">
definePageMeta({
  layout: 'landing'
})
</script>

<template>
  <UPage>
    <LandingHeroBanner />

    <main id="mesas">
      <LandingSessionsGrid />

      <!-- <LandingCommunityPanel /> -->
    </main>
  </UPage>
</template>
