<script setup lang="ts">
import * as z from 'zod'

const props = defineProps<{
    master_name?: string
    phone?: string
    session_type?: string
    session_title?: string
}>()

const isOpen = ref(false)

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
    name: '',
})

const message = computed(() => {
    const baseText = `Hola master ${props.master_name}, quiero reservar mi lugar en ${props.session_title} (${props.session_type})`
    const nameText = state.name?.trim() ? ` Mi nombre es ${state.name.trim()}.` : ''
    return encodeURIComponent(`${baseText}${nameText}`)
})

const wame = computed(() => {
    return `https://wa.me/${props.phone}?text=${message.value}`
})

function openWhatsApp() {
    if (!props.phone) {
        return
    }

    if (import.meta.client) {
        window.open(wame.value, '_blank', 'noopener,noreferrer')
    }

    isOpen.value = false
    state.name = ''
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Reserva tu lugar">
        <UButton block label="Aparta tu lugar" class="mt-3 cursor-pointer" @click="isOpen = true" />

        <template #body>
            <UForm :schema="schema" :state="state" class="space-y-4 w-full">
                <UFormField label="Nombre o apodo" name="name" required>
                    <UInput v-model="state.name" class="w-full" />
                </UFormField>
                <USeparator class="my-8" />
                <UButton type="button" block @click="openWhatsApp" :disabled="!state.name?.length" class="cursor-pointer">
                    Reservar
                </UButton>
            </UForm>
        </template>
    </UModal>
</template>
