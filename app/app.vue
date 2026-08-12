<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

const title = 'Dagas y Dados | Plataforma de Mesas de Rol'
const description = 'Encuentra campañas y one-shots de Daggerheart y otros sistemas RPG. Aparta tu lugar, prepara tus dados y únete a la comunidad más activa.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'summary_large_image.jpeg',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtLoadingIndicator />
  <UApp>
    <SiteNav />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
