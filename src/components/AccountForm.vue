<script lang="ts" setup>
import { useAccountStore } from '@/stores/useAccountStore'
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import IconPasswordShow from './icons/IconPasswordShow.vue'
import IconPasswordHidden from './icons/IconPasswordHidden.vue'
import IconWarning from './icons/IconWarning.vue'
import IconPlus from './icons/IconPlus.vue'

const store = useAccountStore()
const accounts = computed(() => store.accounts)
const addAccount = store.addAccount
const removeAccount = store.removeAccount
const updateAccount = store.updateAccount

interface AccountEntry {
  id: string;
  labels: { text: string }[];
  rawLabel: string;
  type: 'Локальная' | 'LDAP';
  login: string;
  password: string | null;
}

interface Errors {
  [key: string]: {
    label?: boolean;
    login?: boolean;
    password?: boolean;
  }
}

const errors: Errors = reactive({});
const showPasswords = ref<Record<string, boolean>>({});
const topBlock = ref<HTMLElement | null>(null);
const isButtonFixed = ref(false);
const isMobile = ref(window.innerWidth <= 767);


function togglePasswordVisibility(id: string) {
  showPasswords.value[id] = !showPasswords.value[id]
}

function hasError(id: string, field: keyof Errors[string]) {
  return errors[id]?.[field] || false;
}

function onLabelBlur(account: AccountEntry) {
  const trimmed = account.rawLabel.trim();
  const parts = trimmed
    .split(';')
    .map(part => part.trim())
    .filter(part => part.length > 0);
  account.labels = parts.map(part => ({ text: part }));
}

function onTypeChange(account: AccountEntry) {
  if (account.type === 'LDAP') {
    account.password = null;
  } else if (account.password === null) {
    account.password = '';
  }
}

function validateLogin(account: AccountEntry) {
  const id = account.id;
  if (!errors[id]) errors[id] = {};

  errors[id].login = account.login.trim() === '' || account.login.length > 100;

  const hasAnyError = Object.values(errors[id]).some(Boolean);
  if (!hasAnyError) {
    updateAccount(account);
  }
}

function validatePassword(account: AccountEntry) {
  const id = account.id;
  if (!errors[id]) errors[id] = {};

  errors[id].password = account.type === 'Локальная'
    ? (!account.password || account.password.trim() === '' || account.password.length > 100)
    : false

  const hasAnyError = Object.values(errors[id]).some(Boolean);
  if (!hasAnyError) {
    updateAccount(account);
  }
}

function handleScroll() {
  if (!topBlock.value) return

  const rect = topBlock.value.getBoundingClientRect();
  isButtonFixed.value = rect.bottom <= 0;
}
function handleResize() {
  isMobile.value = window.innerWidth <= 767;
}

onMounted(() => {
  accounts.value.forEach(account => {
    const loginEmpty = account.login.trim() === '';
    const passwordEmpty = account.type === 'Локальная' && (!account.password || account.password.trim() === '');

    if (loginEmpty || passwordEmpty) {
      removeAccount(account.id);
      return
    }
  })
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
})

</script>

<template>
  <div class="container mt-4">
    <div ref="topBlock" 
      class="container__top-block d-flex justify-content-between align-items-center mb-3"
    >
      <h2>Учетные записи</h2>
      <button
        :class="['btn btn-success d-flex justify-content-center align-items-center', { 'fixed-add-button': isButtonFixed }]"
        @click="addAccount"
      >
        <span v-if="isButtonFixed && isMobile" class="btn-text">Добавить учетную запись</span>
        <div v-else class="btn-icon">
          <IconPlus/>
        </div>
      </button>
    </div>

    <div class="wrapper empty d-flex justify-content-center" v-if="accounts.length === 0">
      <div class="form-text">Создайте учетную запись</div>
    </div>

    <div class="wrapper" v-else>
      <div class="container__warning d-flex justify-content-start align-items-center">
        <IconWarning/>
        <div class="form-text desktop-text">
          Для указания нескольких меток для одной пары логин/пароль используйте разделитель ";"
        </div>
      </div>
      

      <div v-for="(account, index) in accounts" :key="account.id" class="card d-flex mb-3 p-3">
        <div class="row g-3 align-items-start ">

          <!-- Метка -->
          <div class="col-md-3">
            <label class="form-label">Метка</label>
            <input
              type="text"
              class="form-control"
              :class="{ 'is-invalid': hasError(account.id, 'label') }"
              v-model="account.rawLabel"
              @focus="onLabelBlur(account)"
              placeholder="Введите метки через ;"
              maxlength="50"
            />
            <div class="form-text mobile-text">Введите метки через точку с запятой (;)</div>
          </div>

          <!-- Тип записи -->
          <div class="col-md-2">
            <label class="form-label">Тип записи</label>
            <select
              class="form-select"
              v-model="account.type"
              @change="onTypeChange(account)"
            >
              <option value="Локальная">Локальная</option>
              <option value="LDAP">LDAP</option>
            </select>
          </div>

          <!-- Логин -->
          <div :class="account.type === 'LDAP' ? 'col-md-4' : 'col-md-3'">
            <label class="form-label">Логин</label>
            <input
              type="text"
              class="form-control"
              :class="{ 'is-invalid': hasError(account.id, 'login') }"
              v-model="account.login"
              @blur="() => validateLogin(account)"
              maxlength="100"
              autocomplete="off"
            />
          </div>

          <!-- Пароль -->
          <div v-if="account.type === 'Локальная'" class="row__password col-md-3">
            <label class="form-label">Пароль</label>
            <div class="input-wraper">
              <input
                :type="showPasswords[account.id] ? 'text' : 'password'"
                class="form-control"
                :class="{ 'is-invalid': hasError(account.id, 'password') }"
                v-model="account.password"
                @blur="() => validatePassword(account)"
                maxlength="100"
                autocomplete="off"
              />
              <button
                v-if="!hasError(account.id, 'password')"
                class="btn"
                type="button"
                @click="togglePasswordVisibility(account.id)"
              >
                <IconPasswordShow v-if="showPasswords[account.id]"/>
                <IconPasswordHidden v-else/>
              </button>
            </div>
          </div>

          <!-- Удалить -->
          <div class="row__remove-btn col-md-1 text-end">
            <button class="btn btn-outline-danger mt-4" @click="removeAccount(account.id)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style lang="scss" scoped>
.container {
  width: 100%;
  min-width: 310px;

  .empty {
    margin-top: 50px;
    .form-text {
      color: var(--vt-c-text-dark-2);
    }
  }
  
  .container__top-block {
    .fixed-add-button {
      position: fixed;
      bottom: 20px;
      right: 30px;
      height: 40px;
      z-index: 10;
      @media screen and (max-width: 767px) {
        width: calc(100% - var(--bs-gutter-x));
        left: 50%;
        transform: translateX(-50%);
        max-width: 517px;
        padding: 0.75rem 1.5rem;
      }
    }
  }
  .container__warning{
    margin: 0 0 1rem 10px;
    gap: 10px;
    @media screen and (max-width: 767px) {
      display: none !important;
    }
    .desktop-text {
      color: var(--vt-c-text-dark-2);
      margin: 0;
    }
  }
  .wrapper {
    .card {
      border-radius: 10px;
      gap: 4px;
      background: var(--vt-c-white-mute);

      .mobile-text {
        display: none;
        @media screen and (max-width: 767px) {
          display: block;
        }
      }
      .col-md-4 {
        flex: 1 0 auto;
      }
      .input-wraper {
        position: relative;
        .btn {
          position: absolute;
          right: 0;
          top: 0;
          border: none;
        }
      }
      .row__remove-btn {
        margin-top: calc(var(--bs-gutter-y) + 7px);

        @media screen and (max-width: 767px) {
          margin-top: 0;
        }
      }
    }
  }
  .wrapper > div:last-child {
    margin-bottom: 70px !important;
  }
}

</style>