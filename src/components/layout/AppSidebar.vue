<template>
  <aside
    :class="[
      'fixed top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 flex flex-col min-h-dvh h-dvh overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out z-99999 border-r border-gray-200',
      {
        'lg:w-[290px]': isExpanded || isMobileOpen || isHovered,
        'lg:w-[90px]': !isExpanded && !isHovered,
        'translate-x-0 w-[290px]': isMobileOpen,
        '-translate-x-full': !isMobileOpen,
        'lg:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <div
      :class="[
        'py-8 flex',
        !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start',
      ]"
    >
      <router-link to="/" class="flex items-center gap-2">
        <div
          v-if="isExpanded || isHovered || isMobileOpen"
          class="text-2xl font-bold text-brand-500 dark:text-brand-400"
        >
          Ucup Kasir
        </div>
        <div
          v-else
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-lg"
        >
          UK
        </div>
      </router-link>
    </div>
    <div
      class="flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden duration-300 ease-linear custom-scrollbar"
    >
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <div v-for="(menuGroup, groupIndex) in menuGroups" :key="groupIndex">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-[20px] text-gray-400',
                !isExpanded && !isHovered
                  ? 'lg:justify-center'
                  : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ menuGroup.title }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-4">
              <li v-for="(item, index) in menuGroup.items" :key="item.name">
                <button
                  v-if="item.subItems"
                  @click="toggleSubmenu(groupIndex, index)"
                  :class="[
                    'menu-item group w-full',
                    {
                      'menu-item-active': isSubmenuOpen(groupIndex, index),
                      'menu-item-inactive': !isSubmenuOpen(groupIndex, index),
                    },
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(groupIndex, index)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      {
                        'rotate-180 text-brand-500': isSubmenuOpen(
                          groupIndex,
                          index
                        ),
                      },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="item.path"
                  :to="item.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(item.path),
                      'menu-item-inactive': !isActive(item.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(item.path)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                </router-link>
                <transition
                  @enter="startTransition"
                  @after-enter="endTransition"
                  @before-leave="startTransition"
                  @after-leave="endTransition"
                >
                  <div
                    v-show="
                      isSubmenuOpen(groupIndex, index) &&
                      (isExpanded || isHovered || isMobileOpen)
                    "
                  >
                    <ul class="mt-2 space-y-1 ml-9">
                      <li v-for="subItem in item.subItems" :key="subItem.name">
                        <router-link
                          :to="subItem.path"
                          :class="[
                            'menu-dropdown-item',
                            {
                              'menu-dropdown-item-active': isActive(
                                subItem.path
                              ),
                              'menu-dropdown-item-inactive': !isActive(
                                subItem.path
                              ),
                            },
                          ]"
                        >
                          {{ subItem.name }}
                          <span class="flex items-center gap-1 ml-auto">
                            <span
                              v-if="subItem.new"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              new
                            </span>
                            <span
                              v-if="subItem.pro"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              pro
                            </span>
                          </span>
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </transition>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";

import {
  GridIcon,
  CalenderIcon,
  UserCircleIcon,
  UserGroupIcon,
  ChatIcon,
  MailIcon,
  DocsIcon,
  PieChartIcon,
  ChevronDownIcon,
  HorizontalDots,
  PageIcon,
  TableIcon,
  ListIcon,
  PlugInIcon,
  ReceiptIcon,
  SettingsIcon,
  WarehouseIcon,
  TruckIcon,
} from "../../icons";
import SidebarWidget from "./SidebarWidget.vue";
import BoxCubeIcon from "@/icons/BoxCubeIcon.vue";
import BarChartIcon from "@/icons/BarChartIcon.vue";
import { useSidebar } from "@/composables/useSidebar";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();

const { isExpanded, isMobileOpen, isHovered, openSubmenu, closeMobileSidebar } = useSidebar();
const authStore = useAuthStore();

// Auto-close sidebar on route change for mobile
watch(() => route.path, () => {
  closeMobileSidebar()
})

// Permission hanya untuk menyembunyikan menu (UI). Penegakan di database.
const allMenuGroups = [
  {
    title: "Menu",
    items: [
      {
        icon: GridIcon,
        name: "Dashboard",
        path: "/",
        permission: "dashboard.read",
      },
      {
        name: "Products",
        icon: BoxCubeIcon,
        subItems: [
          { name: "Daftar Produk", path: "/products", pro: false, permission: "product.read" },
          { name: "Daftar Kategori", path: "/categories", pro: false, permission: "product.read" },
        ],
      },
      {
        name: "Stok Gudang",
        icon: WarehouseIcon,
        subItems: [
          { name: "Kelola Stok", path: "/stock", pro: false, permission: "stock.read" },
          { name: "Riwayat Mutasi", path: "/stock/movements", pro: false, permission: "stock.read" },
        ],
      },
      {
        name: "Transaksi",
        icon: ReceiptIcon,
        subItems: [
          { name: "Daftar Transaksi", path: "/transactions", pro: false, permission: "transaction.read" },
          { name: "Transaksi Baru", path: "/transactions/add", pro: false, permission: "transaction.write" },
          { name: "Daftar Retur", path: "/returns", pro: false, permission: "transaction.read" },
        ],
      },
      {
        name: "Laporan",
        icon: PieChartIcon,
        subItems: [
          { name: "Keuntungan Harian", path: "/reports/daily-profit", pro: false, permission: "report.sales.read" },
          { name: "Laporan Penjualan", path: "/reports/sales", pro: false, permission: "report.sales.read" },
          { name: "Laporan Laba Rugi", path: "/reports/profit-loss", pro: false, permission: "report.sales.read" },
          { name: "Laba Per Transaksi", path: "/reports/transaction-profit", pro: false, permission: "report.sales.read" },
        ],
      },
      {
        name: "Keuangan",
        icon: BarChartIcon,
        subItems: [
          { name: "Dashboard Keuangan", path: "/finance", pro: false, permission: "finance.read" },
          { name: "Chart of Accounts", path: "/finance/accounts", pro: false, permission: "finance.read" },
          { name: "Jurnal Umum", path: "/finance/journal", pro: false, permission: "finance.read" },
          { name: "Buku Besar", path: "/finance/ledger", pro: false, permission: "finance.read" },
          { name: "Neraca Saldo & Penyesuaian", path: "/finance/trial-balance", pro: false, permission: "finance.read" },
          { name: "Neraca", path: "/finance/balance-sheet", pro: false, permission: "finance.read" },
          { name: "Laporan Keuangan", path: "/finance/statements", pro: false, permission: "finance.read" },
          { name: "Arus Kas", path: "/finance/cash-flow", pro: false, permission: "finance.read" },
          { name: "Tutup Buku", path: "/finance/closing-periods", pro: false, permission: "finance.read" },
        ],
      },
      {
        name: "Pembelian",
        icon: BoxCubeIcon,
        subItems: [
          { name: "Dashboard", path: "/purchasing", pro: false, permission: "purchasing.read" },
          { name: "Supplier", path: "/purchasing/suppliers", pro: false, permission: "purchasing.read" },
          { name: "Purchase Order", path: "/purchasing/pos", pro: false, permission: "purchasing.read" },
          { name: "Terima Barang", path: "/purchasing/grns", pro: false, permission: "purchasing.read" },
          { name: "Faktur", path: "/purchasing/pis", pro: false, permission: "purchasing.read" },
          { name: "Retur", path: "/purchasing/returns", pro: false, permission: "purchasing.read" },
        ],
      },
      {
        name: "Karyawan & Payroll",
        icon: UserCircleIcon,
        subItems: [
          { name: "Daftar Karyawan", path: "/hr/employees", pro: false, permission: "hr.read" },
          { name: "Kasbon", path: "/hr/loans", pro: false, permission: "hr.read" },
          { name: "Payroll", path: "/hr/payroll", pro: false, permission: "hr.read" },
        ],
      },
      {
        name: "Pengiriman",
        icon: TruckIcon,
        subItems: [
          { name: "Surat Jalan", path: "/shipping/deliveries", pro: false, permission: "shipping.read" },
          { name: "Kendaraan", path: "/shipping/vehicles", pro: false, permission: "shipping.read" },
        ],
      },
      {
        name: "Customer",
        icon: UserGroupIcon,
        subItems: [
          { name: "Daftar Customer", path: "/customers", pro: false, permission: "customer.read" },
        ],
      },
      {
        icon: ReceiptIcon,
        name: "Invoice Pelanggan",
        path: "/customer-invoices",
        permission: "transaction.read",
      },
      {
        icon: SettingsIcon,
        name: "Pengaturan",
        path: "/settings",
        permission: "settings.read",
      },
      {
        icon: UserGroupIcon,
        name: "Kelola Pengguna",
        path: "/settings/users",
        permission: "user.manage",
      },
    ],
  },
];

/**
 * Saring menu sesuai permission. Selama keanggotaan belum termuat, menu
 * dikosongkan (fail-closed) — lebih baik menu sempat kosong sekejap daripada
 * menampilkan tautan yang pasti ditolak.
 */
const menuGroups = computed(() => {
  if (!authStore.membershipLoaded) return [];
  return allMenuGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (item.subItems) {
            const subItems = item.subItems.filter(
              (sub) => !sub.permission || authStore.can(sub.permission)
            );
            return subItems.length > 0 ? { ...item, subItems } : null;
          }
          return !item.permission || authStore.can(item.permission) ? item : null;
        })
        .filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);
});

const isActive = (path) => route.path === path;

const toggleSubmenu = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`;
  openSubmenu.value = openSubmenu.value === key ? null : key;
};

const isAnySubmenuRouteActive = computed(() => {
  return menuGroups.value.some((group) =>
    group.items.some(
      (item) =>
        item.subItems && item.subItems.some((subItem) => isActive(subItem.path))
    )
  );
});

const isSubmenuOpen = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`;
  return (
    openSubmenu.value === key ||
    (isAnySubmenuRouteActive.value &&
      menuGroups.value[groupIndex]?.items[itemIndex]?.subItems?.some((subItem) =>
        isActive(subItem.path)
      ))
  );
};

const startTransition = (el) => {
  el.style.height = "auto";
  const height = el.scrollHeight;
  el.style.height = "0px";
  el.offsetHeight; // force reflow
  el.style.height = height + "px";
};

const endTransition = (el) => {
  el.style.height = "";
};
</script>
