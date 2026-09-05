<template>
  <ConfirmDialog
    v-model="confirmState.isOpen"
    :title="confirmState.title"
    :message="confirmState.message"
    :confirm-text="confirmState.confirmText"
    :cancel-text="confirmState.cancelText"
    :variant="confirmState.variant"
    @confirm="resolveConfirm(true)"
    @cancel="resolveConfirm(false)"
  />
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { confirmState, resolveConfirm } from '@/composables/useConfirm'
</script>
