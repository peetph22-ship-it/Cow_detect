#!/bin/bash
sed -i '' 's/transition: opacity 0.3s ease;/transition: opacity 0.15s ease-out;/g' frontend/app/components/Admin/AddUserModal.vue
sed -i '' 's/.modal-fade-leave-active {/.modal-fade-leave-active {\
  transition: opacity 0.2s ease-in;\
}/g' frontend/app/components/Admin/AddUserModal.vue
