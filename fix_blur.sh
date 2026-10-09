#!/bin/bash
sed -i '' 's/.modal-fade-enter-active {/.modal-fade-enter-active,\
.modal-fade-leave-active {\
  transition: opacity 0.3s ease-out;\
}\
\
.modal-fade-enter-active .backdrop,\
.modal-fade-leave-active .backdrop {\
  transition: backdrop-filter 0.3s ease-out, background-color 0.3s ease-out;\
}\
\
.modal-fade-enter-from .backdrop,\
.modal-fade-leave-to .backdrop {\
  backdrop-filter: blur(0px);\
  background-color: transparent;\
}/g' frontend/app/components/Admin/AddUserModal.vue

sed -i '' '/.modal-fade-leave-active {/d' frontend/app/components/Admin/AddUserModal.vue
sed -i '' '/transition: opacity 0.2s ease-in;/d' frontend/app/components/Admin/AddUserModal.vue
