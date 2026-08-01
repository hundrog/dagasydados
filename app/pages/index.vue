<script setup lang="ts">
definePageMeta({
  layout: "landing",
});

const modalOpen = ref(false)
const modalTitle = ref('')

function openReserve(title: string) {
  modalTitle.value = title
  modalOpen.value = true
}
</script>

<template>
  <UPage>
    <LandingHeroBanner />

    <main id="mesas">
      <LandingSessionsGrid />

      <!-- <LandingCommunityPanel /> -->
    </main>

    <!-- <LandingReserveModal v-model:open="modalOpen" :session-title="modalTitle" /> -->
  </UPage>
</template>