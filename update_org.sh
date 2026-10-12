#!/bin/bash
sed -i '' 's/name: false,/name: false,\
  org: false,/g' frontend/app/components/Admin/AddUserModal.vue

sed -i '' 's/errors.name = false/errors.name = false\
  errors.org = false/g' frontend/app/components/Admin/AddUserModal.vue

sed -i '' '/if (!form.phone.trim()) {/i\
  if (!form.org.trim()) {\
    errors.org = true\
    hasError = true\
  }\
' frontend/app/components/Admin/AddUserModal.vue

sed -i '' 's/<label class="text-\[13px\] font-bold text-\[#4e6057\]">ชื่อฟาร์ม \/ สังกัด<\/label>/<label class="text-\[13px\] font-bold text-\[#4e6057\]">ชื่อฟาร์ม \/ สังกัด <span class="text-red-500">*<\/span><\/label>/g' frontend/app/components/Admin/AddUserModal.vue

