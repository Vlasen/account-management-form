import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type AccountType = 'Локальная' | 'LDAP'

export interface AccountEntry {
  id: string;
  labels: { text: string }[];  // Массив меток
  rawLabel: string;            // Метки в виде строки, как введены пользователем
  type: AccountType;           // Тип учетной записи
  login: string;
  password: string | null;
}

export const useAccountStore = defineStore('accountStore', () => {
  const accounts = ref<AccountEntry[]>([]);

  const load = () => {
    const saved = localStorage.getItem('accounts');
    if (saved) {
      try {
        accounts.value = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved accounts:', e);
      }
    }
  }

  watch(accounts, (val) => {
    localStorage.setItem('accounts', JSON.stringify(val))
  }, { deep: true });

  const addAccount = () => {
    accounts.value.push({
      id: crypto.randomUUID(),
      rawLabel: '',
      labels: [],
      type: 'Локальная',
      login: '',
      password: ''
    });
  }

  const removeAccount = (id: string) => {
    accounts.value = accounts.value.filter(acc => acc.id !== id);
  }

  const updateAccount = (updated: AccountEntry) => {
    const index = accounts.value.findIndex(acc => acc.id === updated.id);
    if (index !== -1) {
      accounts.value[index] = { ...updated };
    }
  }

  load();

  return {
    accounts,
    addAccount,
    removeAccount,
    updateAccount
  }
})
