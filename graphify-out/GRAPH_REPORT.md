# Graph Report - src  (2026-11-26)

## Corpus Check
- 364 files · ~334,359 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 1, .backup 1, .bak 1)

## Summary
- 3885 nodes · 7119 edges · 192 communities (177 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.85)
- Token cost: 1,900 input · 900 output

## Community Hubs (Navigation)
- Add Transaction Form
- Add Transaction From Home
- Product List CRUD
- SQLite Sync Repositories
- Customer List CRUD
- Transaction Detail
- Auto Navigation Stack
- Trial Balance
- Invoice Detail
- Transaction List
- Store Settings & Sync Log
- Router & Breadcrumb
- Startup Log & Layout
- Customer Picker Modal
- Navigation Stack Manager
- DB Migration Tools
- Service Barrel & Adapters
- Category List CRUD
- Stock Management
- Customer Transaction Form
- General Ledger
- Sync Engine & SQLite Services
- Journal List
- Group Price List
- Invoice Print
- Delivery Order Form
- Date Picker Modal
- Customer Invoice List
- Customer Detail
- Group Price Form
- Tier Price List
- Delivery Order Print
- Aging Receivables
- Finance Dashboard
- Customer Price Form
- Stock Movements
- Event Logging
- Date Range Field
- Dashboard Stats
- Layout
- Tables
- Settings
- Pricematrix
- Products
- Ecommerce
- Hr
- Pricematrix 2
- Supabase
- Settings 2
- Database
- Finance
- Hr 2
- Reports
- Pricematrix 3
- Sync
- Ui
- Database 2
- Products 2
- Paymentallocationmodal
- Reports 2
- Reports 3
- Stock
- Transactions
- Settings 3
- Pricematrix 4
- Common
- Quickmenu
- Shipping
- Finance 2
- Hr 3
- Shipping 2
- Purchasing
- Sqlite
- Reports 4
- Reports 5
- Finance 3
- Finance 4
- Hr 4
- Finance 5
- Returns
- Finance 6
- Common 2
- Common 3
- Common 4
- Reports 6
- Stock 2
- Stock 3
- Common 5
- Usecsv
- Database 3
- Notifications
- Capacitor.D
- Purchasing 2
- Layout 2
- Forms
- Layout 3
- Reports 7
- Purchasing 3
- Reports 8
- Common 6
- Forms 2
- Invoices
- Database 4
- Hr 5
- Reports 9
- Common 7
- Ecommerce 2
- Hr 6
- Reports 10
- Sqlite 2
- Financialstatements
- Usedeliveryorderpdf
- Layout 4
- Finance 7
- Shipping 3
- Shipping 4
- Common 8
- Purchasing 4
- Shipping 5
- Purchasing 5
- Customers
- Purchasing 6
- Purchasing 7
- Forms 3
- Sync 2
- Categories
- Purchasing 8
- Purchasing 9
- Settings 4
- Common 9
- Common 10
- Charts
- Dashboard
- Finance 8
- Finance 9
- Purchasing 10
- Transactions 2
- Common 11
- Common 12
- Layout 5
- Ecommerce 3
- Profile
- Shipping 6
- Ui 2
- Salesreport
- Gemini Svg.Svg
- Purchasing 11
- Common 13
- Common 14
- Common 15
- Finance 10
- Tables 2
- Useconfirm
- Common 16
- Finance 11
- Reports 11
- App
- Common 17
- Dashboard 2
- Usefinancialstatementpdf
- Usepayrollslippdf
- Itempaymentservice
- Common 18
- Reports 12
- Ui 3
- Ui 4
- Transactions 3
- Tables 3
- Invoices 2
- Ecommerce 4
- Ui 5
- Transactions 4
- Reports 13
- Forms 4
- Dailycash
- Image.Png
- Stock 4
- Transactions 5
- Common 19
- Ui 6
- Ui 7
- Index.D
- Invoices 3
- Invoices 4
- Shipping 7
- Shipping 8

## God Nodes (most connected - your core abstractions)
1. `router` - 100 edges
2. `useToast()` - 83 edges
3. `isNativeApp()` - 41 edges
4. `useAutoNavigationStack()` - 36 edges
5. `logEvent()` - 36 edges
6. `run()` - 31 edges
7. `getCurrentUserId()` - 28 edges
8. `query()` - 27 edges
9. `useConfirm()` - 25 edges
10. `supabase` - 25 edges

## Surprising Connections (you probably didn't know these)
- `resetForm()` --calls--> `confirm()`  [INFERRED]
  views/Invoices/AddCustomerTransaction.vue → components/common/DatePickerModal.vue
- `handleDelete()` --calls--> `confirm()`  [INFERRED]
  views/Shipping/DeliveryOrderDetail.vue → components/common/DatePickerModal.vue
- `saveDate()` --calls--> `confirm()`  [INFERRED]
  views/Shipping/DeliveryOrderDetail.vue → components/common/DatePickerModal.vue
- `resetForm()` --calls--> `confirm()`  [INFERRED]
  views/Transactions/AddTransaction.vue → components/common/DatePickerModal.vue
- `resetForm()` --calls--> `confirm()`  [INFERRED]
  views/Transactions/AddTransactionFromHome.vue → components/common/DatePickerModal.vue

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **DataTable Slot-Based Extension API** — src_components_tables_readme_datatable, src_components_tables_readme_actions_slot, src_components_tables_readme_cell_key_slot, src_components_tables_readme_rowactions_slot [EXTRACTED 1.00]

## Communities (192 total, 15 thin omitted)

### Community 0 - "Add Transaction Form"
Cohesion: 0.04
Nodes (47): applyMatrixPrice(), cartItems, { confirm }, customersStore, decrementQuantity(), discount, discountInput, formatCurrency() (+39 more)

### Community 1 - "Add Transaction From Home"
Cohesion: 0.04
Nodes (46): applyMatrixPrice(), cartItems, { confirm }, customersStore, decrementQuantity(), discount, discountInput, formatCurrency() (+38 more)

### Community 2 - "Product List CRUD"
Cohesion: 0.04
Nodes (36): useProductsStore, allSelected, categoriesStore, categoryOptions, columns, deleteProduct(), editProduct(), EXPORT_HEADERS (+28 more)

### Community 3 - "SQLite Sync Repositories"
Cohesion: 0.11
Nodes (35): addToSyncQueue(), query(), queryOne(), run(), transaction(), AgingReport, AgingRow, AgingSummary (+27 more)

### Community 4 - "Customer List CRUD"
Cohesion: 0.05
Nodes (43): useCustomersStore, activeFilterLabel, allSelected, availableKecamatans, columns, confirmBulkDelete(), confirmDelete(), currentPage (+35 more)

### Community 5 - "Transaction Detail"
Cohesion: 0.04
Nodes (35): allReturnItems, customerInitial, customersStore, discountAmount, effectiveRemaining, { generatePdfBlob, shareToWhatsApp, downloadPdf }, isGeneratingPdf, isOverpaid (+27 more)

### Community 6 - "Auto Navigation Stack"
Cohesion: 0.05
Nodes (35): Props, detectType(), useAutoNavigationStack(), useAutoNavigationStackMultiple(), categoriesStore, formData, isSubmitting, router (+27 more)

### Community 7 - "Trial Balance"
Cohesion: 0.05
Nodes (43): TrialBalanceRow, accountOptions, AdjLine, adjustedBalanced, adjustedTotals, adjustments, balanceStatus, { confirm } (+35 more)

### Community 8 - "Invoice Detail"
Cohesion: 0.04
Nodes (35): allReturnItems, backUrl, customerId, customerInitial, customersStore, effectiveRemaining, { generatePdfBlob, shareToWhatsApp, downloadPdf }, invoiceId (+27 more)

### Community 10 - "Transaction List"
Cohesion: 0.04
Nodes (38): activeFilterChips, allSelected, columns, currentPage, customerFilterOptions, displayTransactions, expandedCards, formatCurrency() (+30 more)

### Community 11 - "Store Settings & Sync Log"
Cohesion: 0.05
Nodes (39): Props, props, SyncLog, addSyncLog(), authStore, backupBusy, expandedSections, formData (+31 more)

### Community 12 - "Router & Breadcrumb"
Cohesion: 0.06
Nodes (20): BreadcrumbProps, authenticatedRoutes, publicRoutes, router, usePurchasingStore, grn, loading, route (+12 more)

### Community 13 - "Startup Log & Layout"
Cohesion: 0.06
Nodes (34): clearStartupLog(), _entries, _listeners, pushStartupLog(), StartupLogEntry, useStartupLog(), onLog(), authStore (+26 more)

### Community 14 - "Customer Picker Modal"
Cohesion: 0.06
Nodes (31): activeKecamatanIndex, allFilteredSelected, availableKecamatan, close(), confirmMulti(), emit, filteredCustomers, isOpen (+23 more)

### Community 15 - "Navigation Stack Manager"
Cohesion: 0.06
Nodes (30): navigationStack, NavigationStackManager, StackLayer, useNavigationStack(), RealisedProfitResult, accounts, applyFilter(), asetRows (+22 more)

### Community 16 - "DB Migration Tools"
Cohesion: 0.09
Nodes (29): runMigration(), toast, loading, result, runFix(), runReset(), toast, migrateIncentiveDetails() (+21 more)

### Community 17 - "Service Barrel & Adapters"
Cohesion: 0.08
Nodes (33): items, Props, props, categoriesService, financeService, hrService, categoriesServiceAdapter, hrServiceAdapter (+25 more)

### Community 18 - "Category List CRUD"
Cohesion: 0.06
Nodes (31): useCategoriesStore, allSelected, categoriesStore, categoriesWithProductCount, categoryToDelete, columns, currentPage, deleteCategory() (+23 more)

### Community 19 - "Stock Management"
Cohesion: 0.05
Nodes (25): categoriesStore, categoryOptions, columns, filters, formattedProducts, menuProduct, minimumStockValue, mobileFilter (+17 more)

### Community 20 - "Customer Transaction Form"
Cohesion: 0.05
Nodes (30): CartItem, cartItems, { confirm }, customersStore, discount, discountInput, isSubmitting, netTotal (+22 more)

### Community 21 - "General Ledger"
Cohesion: 0.06
Nodes (28): accountSearch, applyFilter(), endDate, error, fetchLedger(), groupedAccounts, handleAccountSelect(), ledger (+20 more)

### Community 22 - "Sync Engine & SQLite Services"
Cohesion: 0.11
Nodes (34): isOnlineNow(), markSyncQueueFailed(), removeFromSyncQueue(), sqliteCategoriesService, sqliteCustomersService, sqliteNotificationsService, sqliteProductsService, sqliteReturnsService (+26 more)

### Community 23 - "Journal List"
Cohesion: 0.06
Nodes (21): applyQuickPeriod(), { confirm }, currentPage, deletingId, endDate, filteredJournals, formatDate(), paginatedJournals (+13 more)

### Community 24 - "Group Price List"
Cohesion: 0.06
Nodes (30): askDelete(), confirmOpen, deleteFromSheet(), doDelete(), editFromSheet(), editItem(), expanded, filtered (+22 more)

### Community 25 - "Invoice Print"
Cohesion: 0.06
Nodes (30): allReturnItems, backUrl, customerId, customersStore, discount, formatShortDate(), invoiceId, isOverpaid (+22 more)

### Community 26 - "Delivery Order Form"
Cohesion: 0.06
Nodes (24): availableLoaderOptions, customersStore, doId, driverOptions, form, hr, isEdit, loaders (+16 more)

### Community 27 - "Date Picker Modal"
Cohesion: 0.06
Nodes (20): calendarCells, dayNames, maxDateObj, monthNames, monthPickerRef, now, Props, props (+12 more)

### Community 28 - "Customer Invoice List"
Cohesion: 0.06
Nodes (26): customer, customerId, customerInitial, customerInvoices, customersStore, customerSubtitle, filteredInvoices, filters (+18 more)

### Community 29 - "Customer Detail"
Cohesion: 0.06
Nodes (22): activeFilterCount, customer, customerId, customersStore, effectiveCreditLimit, filteredTransactions, filters, hasActiveFilters (+14 more)

### Community 30 - "Group Price Form"
Cohesion: 0.06
Nodes (24): availableProducts, canSubmit, confirmLeaveOpen, doLeave(), form, groups, handleBack(), id (+16 more)

### Community 31 - "Tier Price List"
Cohesion: 0.07
Nodes (27): askDelete(), confirmOpen, deleteFromSheet(), doDelete(), editFromSheet(), editTier(), filtered, filterStatus (+19 more)

### Community 32 - "Delivery Order Print"
Cohesion: 0.07
Nodes (30): buildPdfData(), busy, customersStore, doFilename(), doId, drops, { generatePdfBlob, sharePdf }, handlePrint() (+22 more)

### Community 33 - "Aging Receivables"
Cohesion: 0.07
Nodes (22): agingReceivablesService, AgingReport, AgingRow, AgingSummary, agingReceivablesServiceAdapter, bucketFilter, currentPage, dateEnd (+14 more)

### Community 34 - "Finance Dashboard"
Cohesion: 0.07
Nodes (25): applyFilter(), assetBalances, balances, cashBalance, cashFlow, endDate, fetchData(), hasOldTransactions (+17 more)

### Community 35 - "Customer Price Form"
Cohesion: 0.07
Nodes (22): availableProducts, canSubmit, confirmLeaveOpen, customers, doLeave(), form, handleBack(), id (+14 more)

### Community 36 - "Stock Movements"
Cohesion: 0.07
Nodes (18): applyFilters(), columns, currentPage, filteredMovements, filters, formattedMovements, itemsPerPage, paginatedMovements (+10 more)

### Community 37 - "Event Logging"
Cohesion: 0.14
Nodes (22): EventLevel, flushToSQLite(), getLocalEntries(), guessSource(), installEventLog(), loadBuffer(), logEvent(), LogEventInput (+14 more)

### Community 38 - "Date Range Field"
Cohesion: 0.08
Nodes (20): activePresetKey, applyPreset(), calendarCells, dayNames, draftEnd, draftStart, goToView(), isEdge() (+12 more)

### Community 39 - "Dashboard Stats"
Cohesion: 0.09
Nodes (22): cards, formatCurrency(), formatNumber(), Props, props, activeFilter, customerInvoices(), customerOutstanding() (+14 more)

### Community 40 - "Layout"
Cohesion: 0.07
Nodes (6): isActive(), isAnySubmenuRouteActive, { isExpanded, isMobileOpen, isHovered, openSubmenu, closeMobileSidebar }, isSubmenuOpen(), menuGroups, route

### Community 41 - "Tables"
Cohesion: 0.07
Nodes (22): activePopup, Column, currentPage, DataTableProps, emit, endIndex, expandedRows, filterCategoryOptions (+14 more)

### Community 42 - "Settings"
Cohesion: 0.13
Nodes (26): getMetadata(), getSyncQueue(), SyncQueueItem, getLastSyncInfo(), SyncResult, formatHealthCheck(), formatTestResult(), getTableCounts() (+18 more)

### Community 43 - "Pricematrix"
Cohesion: 0.08
Nodes (25): askDelete(), confirmOpen, deleteFromSheet(), doDelete(), editFromSheet(), editItem(), filtered, filterStatus (+17 more)

### Community 44 - "Products"
Cohesion: 0.08
Nodes (23): categoriesStore, categoryOptions, displayPriceBuy, displayPriceSell, formatCurrency(), formatPriceBuy(), formatPriceSell(), formData (+15 more)

### Community 45 - "Ecommerce"
Cohesion: 0.07
Nodes (24): Props, Props, authStore, bankBalance, cashBalance, categoriesStore, displayName, financeStore (+16 more)

### Community 46 - "Hr"
Cohesion: 0.07
Nodes (19): hasActiveMenu, route, useHrStore, errorMsg, form, isEdit, loading, route (+11 more)

### Community 47 - "Pricematrix 2"
Cohesion: 0.08
Nodes (24): customersServiceAdapter, priceMatrixServiceAdapter, CachedCustomerPrice, inDateRange(), ResolvedPrice, todayStr(), usePriceMatrixStore, allCustomers (+16 more)

### Community 48 - "Supabase"
Cohesion: 0.09
Nodes (20): Props, originalFrom, originalRpc, QUERY_METHODS, supabase, wrapAuth(), wrapBuilder(), customersService (+12 more)

### Community 49 - "Settings 2"
Cohesion: 0.08
Nodes (19): ToastOptions, toasts, useToast(), PaymentAllocationResult, forceSQLiteMigration(), hasRun, loading, result (+11 more)

### Community 50 - "Database"
Cohesion: 0.17
Nodes (24): Attendance, AttendanceInsert, AttendanceUpdate, DeliveryOrderTransaction, DeliveryOrderTransactionInput, Employee, EmployeeInsert, EmployeeLoan (+16 more)

### Community 51 - "Finance"
Cohesion: 0.08
Nodes (21): activePreset, applyPreset(), error, exporting, formatDateShort(), { generatePdfBlob, sharePdf }, loading, periodEnd (+13 more)

### Community 52 - "Hr 2"
Cohesion: 0.08
Nodes (25): buildPdfData(), busy, employeeCode, employeeName, { generatePdfBlob, sharePdf }, handlePrint(), handleShare(), isNative (+17 more)

### Community 53 - "Reports"
Cohesion: 0.12
Nodes (20): useSalesReportStore, localMonthStart(), useSalesReportEnhancedStore, localDateFromIso(), localDateOffsetStr(), localDateStr(), localTodayStr(), activePreset (+12 more)

### Community 54 - "Pricematrix 3"
Cohesion: 0.09
Nodes (24): askDelete(), confirmOpen, deleteFromSheet(), doDelete(), editFromSheet(), editItem(), filtered, groups (+16 more)

### Community 55 - "Sync"
Cohesion: 0.16
Nodes (19): logError(), checkAndRunScheduledSync(), checkIfCharging(), DEFAULT_CONFIG, disableScheduledSync(), enableScheduledSync(), getScheduledSyncConfig(), getScheduledSyncStatus() (+11 more)

### Community 56 - "Ui"
Cohesion: 0.10
Nodes (18): AlertProps, icons, props, variantClasses, close(), dismissDir, dragging, dragStyle (+10 more)

### Community 57 - "Database 2"
Cohesion: 0.17
Nodes (22): TransactionExecutor, purchasingServiceAdapter, purchasingService, sqlitePurchasingService, GoodsReceipt, GoodsReceiptInput, GoodsReceiptItem, PurchaseInvoice (+14 more)

### Community 58 - "Products 2"
Cohesion: 0.10
Nodes (19): categoriesStore, categoryOptions, displayPriceBuy, displayPriceSell, formatCurrency(), formatPriceBuy(), formatPriceSell(), formData (+11 more)

### Community 59 - "Paymentallocationmodal"
Cohesion: 0.09
Nodes (16): allocations, close(), emit, Emits, formatNumber(), items, loading, onAllocationInput() (+8 more)

### Community 60 - "Reports 2"
Cohesion: 0.09
Nodes (18): chartData, dateFieldRef, fetchReport(), financeStore, formatCurrency(), isToday, loadExpenseBalances(), loading (+10 more)

### Community 61 - "Reports 3"
Cohesion: 0.10
Nodes (18): BankTransaction, dailyBankService, DailyBankSummary, dailyBankServiceAdapter, applyDate(), applyPreset(), currentBalance, endDate (+10 more)

### Community 62 - "Stock"
Cohesion: 0.10
Nodes (20): close(), emit, filteredItems, generateOpnameNumber(), handleSubmit(), isFormValid, items, loading (+12 more)

### Community 63 - "Transactions"
Cohesion: 0.08
Nodes (20): allReturnItems, customersStore, discountAmount, loading, originalSubtotal, returnAmount, returnsStore, route (+12 more)

### Community 64 - "Settings 3"
Cohesion: 0.09
Nodes (18): clearLocalEntries(), EventLogEntry, EventSource, clearEventLogTable(), clearAll(), { confirm }, confirmClear(), entries (+10 more)

### Community 65 - "Pricematrix 4"
Cohesion: 0.09
Nodes (18): canSubmit, confirmLeaveOpen, customTierName, doLeave(), form, handleBack(), id, isEdit (+10 more)

### Community 66 - "Common"
Cohesion: 0.10
Nodes (14): close(), confirmSelection(), customerTransactions, emit, isOpen, loading, maxAvailableMap, Props (+6 more)

### Community 67 - "Quickmenu"
Cohesion: 0.12
Nodes (20): DEFAULT_QUICK_MENU, getGroupItems(), GROUP_MAP, loadQuickMenuFromStorage(), QUICK_MENU_GROUPS, QUICK_MENU_STORAGE_KEY, QuickMenuGroup, QuickMenuItem (+12 more)

### Community 68 - "Shipping"
Cohesion: 0.09
Nodes (16): useShippingStore, createDeliveryOrder(), currentPage, filtered, isAllSelected, loading, paginated, pendingTransactions (+8 more)

### Community 69 - "Finance 2"
Cohesion: 0.11
Nodes (19): applyFilter(), bankIn, bankNet, bankOut, cashFlow, endDate, error, fetchData() (+11 more)

### Community 70 - "Hr 3"
Cohesion: 0.10
Nodes (16): activeFilterCount, closeForm(), { confirm }, defaultForm(), editTarget, filteredLoans, filterStatus, formLoan (+8 more)

### Community 71 - "Shipping 2"
Cohesion: 0.09
Nodes (14): { confirm }, customerInfo, customersStore, doId, loadRows, order, route, router (+6 more)

### Community 72 - "Purchasing"
Cohesion: 0.10
Nodes (17): digits, emit, formatDigits(), formatted, handleInput(), props, typing, error (+9 more)

### Community 73 - "Sqlite"
Cohesion: 0.15
Nodes (11): priceMatrixService, loadMembers(), sqlitePriceMatrixService, ApplicablePriceResult, CustomerGroup, CustomerGroupMember, CustomerGroupWithMembers, CustomerPriceMatrix (+3 more)

### Community 74 - "Reports 4"
Cohesion: 0.10
Nodes (14): dailyCashServiceAdapter, applyDate(), applyPreset(), currentBalance, endDate, financeStore, loadData(), loading (+6 more)

### Community 75 - "Reports 5"
Cohesion: 0.12
Nodes (14): salesReportEnhancedServiceAdapter, EnhancedReportData, EnhancedSalesSummary, ProductPerformance, salesReportEnhancedService, TransactionDetail, TransactionProfitDetail, TransactionProfitItem (+6 more)

### Community 76 - "Finance 3"
Cohesion: 0.10
Nodes (16): closeModal(), { confirm }, editingId, filteredAccounts, form, formError, handleSave(), openAdd() (+8 more)

### Community 77 - "Finance 4"
Cohesion: 0.10
Nodes (18): closingId, closingJournal, closingPeriod, { confirm }, formatDate(), groupedBalances, handleReopen(), isBalanced (+10 more)

### Community 78 - "Hr 4"
Cohesion: 0.09
Nodes (13): activeTab, attFilterMonth, { confirm }, data, employeePayrolls, filteredAttendance, loading, payrollHistory (+5 more)

### Community 79 - "Finance 5"
Cohesion: 0.13
Nodes (19): { confirm }, dateRange, emit, formatDate(), handleClose(), handleSubmit(), isBalanced, isValid (+11 more)

### Community 80 - "Returns"
Cohesion: 0.10
Nodes (15): returnsServiceAdapter, useReturnsStore, columns, currentPage, filteredReturns, itemsPerPage, paginatedReturns, paginationInfo (+7 more)

### Community 81 - "Finance 6"
Cohesion: 0.10
Nodes (17): useFinanceStore, accountOptions, balanceStatus, form, formatCurrency(), formError, handleSubmit(), Line (+9 more)

### Community 82 - "Common 2"
Cohesion: 0.13
Nodes (15): close(), emit, fileInput, fileName, handleDrop(), handleFileChange(), handleImport(), importing (+7 more)

### Community 83 - "Common 3"
Cohesion: 0.11
Nodes (15): amount, amountInput, amountInputRef, close(), emit, isOpen, isSubmitting, notes (+7 more)

### Community 84 - "Common 4"
Cohesion: 0.13
Nodes (16): addSelectedProducts(), allSelected, availableProducts, categoryOptions, close(), emit, filteredProducts, isOpen (+8 more)

### Community 85 - "Reports 6"
Cohesion: 0.10
Nodes (15): availableYears, currentBalance, currentYear, financeStore, loading, months, now, periodLabel (+7 more)

### Community 86 - "Stock 2"
Cohesion: 0.12
Nodes (18): calculatedStock, canShowPreview, close(), currentStock, emit, form, handleSubmit(), isFormValid (+10 more)

### Community 87 - "Stock 3"
Cohesion: 0.10
Nodes (13): loading, movements, product, productId, productsStore, route, router, showAdjustmentModal (+5 more)

### Community 88 - "Common 5"
Cohesion: 0.13
Nodes (16): close(), downloadTemplate(), emit, fileInput, fileName, handleDrop(), handleFileChange(), handleImport() (+8 more)

### Community 89 - "Usecsv"
Cohesion: 0.14
Nodes (18): csvEscape(), downloadCsv(), parseCsv(), ParseCsvOptions, ParsedCsv, parseNumeric(), readFileAsText(), rowsToCsv() (+10 more)

### Community 90 - "Database 3"
Cohesion: 0.21
Nodes (15): DEFAULT_ACCOUNTS, Account, AccountBalance, AccountInsert, AccountUpdate, AdjustingJournalInput, ClosePeriodInput, ClosingPeriod (+7 more)

### Community 91 - "Notifications"
Cohesion: 0.11
Nodes (10): notificationsServiceAdapter, SqliteNotification, Notification, useNotificationsStore, loading, notifications, notificationsStore, router (+2 more)

### Community 92 - "Capacitor.D"
Cohesion: 0.11
Nodes (9): @capacitor/device, BatteryInfo, Device, DeviceInfo, @capacitor/local-notifications, LocalNotifications, LocalNotificationSchema, @capacitor/preferences (+1 more)

### Community 93 - "Purchasing 2"
Cohesion: 0.11
Nodes (14): formError, handlePay(), load(), loading, payAmount, payMethod, payNotes, pi (+6 more)

### Community 94 - "Layout 2"
Cohesion: 0.12
Nodes (13): authStore, avatarUrl, closeDropdown(), displayName, dropdownOpen, dropdownRef, handleClickOutside(), handleSignOut() (+5 more)

### Community 95 - "Forms"
Cohesion: 0.11
Nodes (10): products, dropzoneForm, props, errorEmail, successEmail, disabledDescription, errorDescription, normalDescription (+2 more)

### Community 96 - "Layout 3"
Cohesion: 0.13
Nodes (11): closeDropdown(), dropdownOpen, dropdownRef, handleClickOutside(), handleItemClick(), handleViewAllClick(), notifications, notificationsStore (+3 more)

### Community 97 - "Reports 7"
Cohesion: 0.12
Nodes (10): financialHidden, Props, props, activeInfoTooltip, financialHidden, Props, props, props (+2 more)

### Community 98 - "Purchasing 3"
Cohesion: 0.12
Nodes (12): POItemInput, form, formError, itemSubtotal(), products, productsStore, router, saving (+4 more)

### Community 99 - "Reports 8"
Cohesion: 0.11
Nodes (12): currentTransactionPage, dateRangeRef, expenseBalanceByAccount, financeStore, netProfit, paginatedTransactions, realizedNetProfit, router (+4 more)

### Community 100 - "Common 6"
Cohesion: 0.13
Nodes (11): close(), emit, isOpen, isSubmitting, notes, Props, props, quantities (+3 more)

### Community 101 - "Forms 2"
Cohesion: 0.13
Nodes (12): emit, isOpen, multiSelectRef, props, removeItem(), selectedItems, toggleItem(), options (+4 more)

### Community 102 - "Invoices"
Cohesion: 0.12
Nodes (11): { isExpanded, isHovered }, { toggleMobileSidebar, isMobileOpen }, useSidebar(), customersStore, filteredKecamatan, loading, router, searchQuery (+3 more)

### Community 103 - "Database 4"
Cohesion: 0.28
Nodes (14): DeliveryItem, DeliveryItemInsert, DeliveryLoader, DeliveryLoaderInput, DeliveryLoadItem, DeliveryLoadItemInput, DeliveryOrder, DeliveryOrderInsert (+6 more)

### Community 104 - "Hr 5"
Cohesion: 0.12
Nodes (11): { confirm }, expandedCards, filteredPayrolls, filterEndDate, filterSearch, filterStartDate, loading, router (+3 more)

### Community 105 - "Reports 9"
Cohesion: 0.12
Nodes (10): activePreset, applyFilter(), fetchReport(), paymentStatusOptions, reportStore, showFilterModal, tempEndDate, tempPaymentStatus (+2 more)

### Community 106 - "Common 7"
Cohesion: 0.17
Nodes (14): countdown(), daysArray, endTime, format(), getMaxValueForUnit(), getTimeArray(), hoursArray, minutesArray (+6 more)

### Community 107 - "Ecommerce 2"
Cohesion: 0.12
Nodes (12): chartOptions, date, flatpickrConfig, options, selected, series, date, flatpickrConfig (+4 more)

### Community 108 - "Hr 6"
Cohesion: 0.13
Nodes (12): activeEmployees, activeLoans, canSubmit, emit, employeeOptions, form, handleSubmit(), loading (+4 more)

### Community 109 - "Reports 10"
Cohesion: 0.17
Nodes (10): Props, props, Props, CategorySales, ProductSales, ReportItem, ReportReturn, sqliteSalesReportService (+2 more)

### Community 110 - "Sqlite 2"
Cohesion: 0.14
Nodes (11): Props, Props, SalesReportData, EnhancedReportData, EnhancedSalesSummary, ProductPerformance, sqliteSalesReportEnhancedService, TransactionDetail (+3 more)

### Community 111 - "Financialstatements"
Cohesion: 0.30
Nodes (15): aggregate(), buildEquityStatement(), buildFinancialStatements(), buildIncomeStatement(), buildPositionStatement(), dayBefore(), isCogsAccount(), lineDate() (+7 more)

### Community 112 - "Usedeliveryorderpdf"
Cohesion: 0.18
Nodes (9): blobToBase64(), DeliveryOrderPdfData, DeliveryOrderPdfDrop, DeliveryOrderPdfRow, formatDate(), useDeliveryOrderPdf(), InvoiceData, StoreSettings (+1 more)

### Community 113 - "Layout 4"
Cohesion: 0.14
Nodes (7): dropdownOpen, isApplicationMenuOpen, notifying, { toggleSidebar, toggleMobileSidebar, isMobileOpen }, SidebarContextType, SidebarSymbol, useSidebarProvider()

### Community 114 - "Finance 7"
Cohesion: 0.18
Nodes (13): financeServiceAdapter, { confirm }, fetchPeriods(), filteredPeriods, filterStatus, formatDate(), handleClosePeriodSuccess(), handleDelete() (+5 more)

### Community 115 - "Shipping 3"
Cohesion: 0.13
Nodes (10): { confirm }, filtered, pendingCount, router, search, statusFilter, statusFilters, store (+2 more)

### Community 116 - "Shipping 4"
Cohesion: 0.16
Nodes (10): closeForm(), { confirm }, editTarget, form, handleSubmit(), openForm(), resetForm(), showForm (+2 more)

### Community 117 - "Common 8"
Cohesion: 0.15
Nodes (8): closeDropdown(), handleMenuItemClick(), open, props, chartOptions, menuItems, props, series

### Community 118 - "Purchasing 4"
Cohesion: 0.15
Nodes (11): emit, handleBack(), Props, props, router, form, formError, router (+3 more)

### Community 119 - "Shipping 5"
Cohesion: 0.18
Nodes (10): availableTransactions, close(), confirm(), emit, Emits, filteredTransactions, props, searchQuery (+2 more)

### Community 120 - "Purchasing 5"
Cohesion: 0.14
Nodes (9): GRNItemInput, form, formError, openPOs, route, router, saving, selectedPOId (+1 more)

### Community 121 - "Customers"
Cohesion: 0.14
Nodes (11): customer, customerId, customersStore, formData, isSubmitting, kecamatanError, loading, route (+3 more)

### Community 122 - "Purchasing 6"
Cohesion: 0.14
Nodes (10): completedGRNs, form, formError, route, router, saving, selectedGRNId, store (+2 more)

### Community 123 - "Purchasing 7"
Cohesion: 0.15
Nodes (9): { confirm }, handleChangeStatus(), load(), loading, po, route, router, store (+1 more)

### Community 124 - "Forms 3"
Cohesion: 0.15
Nodes (9): copyText, countryCodes, email, phoneNumber, phoneNumber2, selectedCountry, selectedCountry2, url (+1 more)

### Community 125 - "Sync 2"
Cohesion: 0.22
Nodes (10): attachListeners(), detachListeners(), isOnline, updateOnlineStatus(), useNetwork(), hasPending, { isOnline }, syncing (+2 more)

### Community 126 - "Categories"
Cohesion: 0.15
Nodes (10): categoriesStore, category, categoryId, formData, isSubmitting, loading, route, router (+2 more)

### Community 127 - "Purchasing 8"
Cohesion: 0.15
Nodes (6): { confirm }, filteredPOs, statusFilter, statusOptions, store, toast

### Community 128 - "Purchasing 9"
Cohesion: 0.15
Nodes (8): form, formError, route, router, saving, selectedPIId, store, totalRefund

### Community 129 - "Settings 4"
Cohesion: 0.15
Nodes (8): authStore, changingPassword, fileInput, profileData, profileInitial, savingProfile, toast, uploading

### Community 130 - "Common 9"
Cohesion: 0.21
Nodes (10): close(), emit, filteredGroups, isOpen, Props, props, router, searchInput (+2 more)

### Community 131 - "Common 10"
Cohesion: 0.23
Nodes (10): applyFilters(), close(), CustomerOption, emit, emptyValues(), filters, Props, props (+2 more)

### Community 132 - "Charts"
Cohesion: 0.18
Nodes (7): chartOptions, series, chartOptions, series, chartOptions, menuItems, series

### Community 133 - "Dashboard"
Cohesion: 0.18
Nodes (5): carouselContainer, currentCardIndex, Props, Product, Props

### Community 134 - "Finance 8"
Cohesion: 0.24
Nodes (9): balances, buildPdfContent(), emit, formatCurrency(), formatDate(), formatDateTime(), groupedBalances, props (+1 more)

### Community 135 - "Finance 9"
Cohesion: 0.20
Nodes (6): emit, onSelect(), prefix, props, toneClass, IncomeStatement

### Community 136 - "Purchasing 10"
Cohesion: 0.18
Nodes (6): loading, pr, route, router, store, toast

### Community 137 - "Transactions 2"
Cohesion: 0.18
Nodes (11): buildServerFilters(), changeTransactionStatus(), clearFilters(), clearModalFilters(), confirmBulkDelete(), confirmDelete(), emptyModalFilters(), fetchData() (+3 more)

### Community 138 - "Common 11"
Cohesion: 0.20
Nodes (10): clearAll(), confirm(), display, draftLabel, emit, fmtShort(), parseYMD(), toYMD() (+2 more)

### Community 139 - "Common 12"
Cohesion: 0.27
Nodes (9): applyFilters(), CategoryOption, close(), emit, filters, FilterValues, Props, props (+1 more)

### Community 140 - "Layout 5"
Cohesion: 0.22
Nodes (7): { toggleTheme }, isDarkMode, isInitialized, Theme, theme, ThemeContext, useTheme()

### Community 141 - "Ecommerce 3"
Cohesion: 0.24
Nodes (7): Props, props, sortedProducts, Props, props, recentProducts, ProductWithCategory

### Community 142 - "Profile"
Cohesion: 0.20
Nodes (3): isProfileAddressModal, isProfileInfoModal, isProfileInfoModal

### Community 143 - "Shipping 6"
Cohesion: 0.27
Nodes (8): close(), emit, Emits, filteredProducts, Props, props, searchQuery, selectProduct()

### Community 144 - "Ui 2"
Cohesion: 0.20
Nodes (9): BadgeColor, BadgeProps, BadgeSize, BadgeVariant, colorStyles, props, sizeClass, sizeStyles (+1 more)

### Community 145 - "Salesreport"
Cohesion: 0.33
Nodes (8): salesReportServiceAdapter, CategorySales, DailySales, PaymentMethodSales, ProductSales, SalesReportData, salesReportService, SalesSummary

### Community 146 - "Gemini Svg.Svg"
Cohesion: 0.24
Nodes (10): Agro / Agriculture Visual Theme, Filename 'gemini-svg' Mismatch (content is Ucup Kasir branding), Drop-Shadow Glow Filter, Blue-Cyan Primary + Emerald Agro Gradient Palette, Agro Leaf / Sprout Motif, Dark Navy Squircle Icon Container, Transaction Node Dot (Digital Pin), Dynamic 'U' Symbol (Distribution Flow Stroke) (+2 more)

### Community 147 - "Purchasing 11"
Cohesion: 0.22
Nodes (7): formatRupiah(), formatRupiahShort(), loading, openPOs, stats, store, unpaidInvoices

### Community 148 - "Common 13"
Cohesion: 0.31
Nodes (8): applyFilters(), close(), emit, filters, InvoiceFilterValues, Props, props, resetFilters()

### Community 149 - "Common 14"
Cohesion: 0.28
Nodes (8): displayLabel, emit, hasValue, onSelect(), open, Props, props, SelectOption

### Community 150 - "Common 15"
Cohesion: 0.31
Nodes (8): close(), emit, filteredOptions, Props, props, searchInputRef, searchQuery, select()

### Community 151 - "Finance 10"
Cohesion: 0.28
Nodes (4): emit, onSelect(), PositionStatement, StatementAccountRow

### Community 152 - "Tables 2"
Cohesion: 0.28
Nodes (6): Column, ColumnFormat, DataTableEmits, DataTableProps, SortOrder, UseDataTableOptions

### Community 153 - "Useconfirm"
Cohesion: 0.39
Nodes (6): { registerDialog, unregisterDialog }, ConfirmOptions, confirmState, resolveConfirm(), settle(), useConfirm()

### Community 154 - "Common 16"
Cohesion: 0.29
Nodes (7): display, emit, internalValue, onPick(), open, Props, props

### Community 155 - "Finance 11"
Cohesion: 0.29
Nodes (5): emit, endingUnclosed, onSelect(), props, EquityStatement

### Community 156 - "Reports 11"
Cohesion: 0.36
Nodes (7): chartOptions, formatCurrency(), formatMethod(), Props, props, series, PaymentMethodSales

### Community 157 - "App"
Cohesion: 0.33
Nodes (5): authStore, settingsStore, storeSettingsServiceAdapter, DEFAULT_SETTINGS, useStoreSettingsStore

### Community 158 - "Common 17"
Cohesion: 0.38
Nodes (6): emit, handleCancel(), handleConfirm(), isOpen, Props, props

### Community 159 - "Dashboard 2"
Cohesion: 0.29
Nodes (4): currentMenuIndex, menuCarouselContainer, MenuGroup, Props

### Community 160 - "Usefinancialstatementpdf"
Cohesion: 0.52
Nodes (6): blobToBase64(), FinancialStatementPdfMeta, formatCurrency(), formatDate(), formatSigned(), useFinancialStatementPdf()

### Community 161 - "Usepayrollslippdf"
Cohesion: 0.48
Nodes (6): blobToBase64(), formatCurrency(), formatDate(), PayrollSlipPdfData, terbilang(), usePayrollSlipPdf()

### Community 162 - "Itempaymentservice"
Cohesion: 0.33
Nodes (5): AllocationInput, ItemPaymentAllocation, ItemPaymentDetail, itemPaymentService, ItemPaymentSummary

### Community 163 - "Common 18"
Cohesion: 0.40
Nodes (6): close(), confirm(), emit, formatDateTimeLocal(), handleDelete(), saveDate()

### Community 164 - "Reports 12"
Cohesion: 0.40
Nodes (5): chartOptions, Props, props, series, DailySales

### Community 165 - "Ui 3"
Cohesion: 0.33
Nodes (5): AvatarProps, props, sizeClasses, statusColorClasses, statusSizeClasses

### Community 166 - "Ui 4"
Cohesion: 0.33
Nodes (4): ButtonProps, props, sizeClasses, variantClasses

### Community 167 - "Transactions 3"
Cohesion: 0.40
Nodes (4): transactionsServiceAdapter, transactionsService, TransactionInput, TransactionStatus

### Community 168 - "Tables 3"
Cohesion: 0.33
Nodes (6): DataTable actions Slot, DataTable cell-{key} Slot, Column Configuration Interface, DataTable Component, Custom Cell Format Function, DataTable rowActions Slot

### Community 169 - "Invoices 2"
Cohesion: 0.33
Nodes (6): formatDateTimeLocal(), handleSubmit(), maxDate, removeFromCart(), resetForm(), validateQuantity()

### Community 171 - "Ui 5"
Cohesion: 0.40
Nodes (4): AspectRatio, aspectRatioClass, Props, props

### Community 172 - "Transactions 4"
Cohesion: 0.40
Nodes (5): useTransactionsStore, deleteTransaction(), handleMenuAction(), viewTransaction(), voidTransaction()

### Community 173 - "Reports 13"
Cohesion: 0.50
Nodes (5): applyPeriod(), getDaysInMonth(), isFuturePeriod(), loadData(), onPeriodChange()

### Community 174 - "Forms 4"
Cohesion: 0.50
Nodes (3): checkboxOne, checkboxThree, checkboxTwo

### Community 175 - "Dailycash"
Cohesion: 0.50
Nodes (3): CashTransaction, dailyCashService, DailyCashSummary

### Community 176 - "Image.Png"
Cohesion: 0.83
Nodes (4): Ucup Kasir App Icon (Document with Dollar Sign), Blue Gradient Brand Background, Document / Invoice Line Icon with Dollar Symbol, Point of Sale / Sales-Billing App Identity

### Community 177 - "Stock 4"
Cohesion: 0.50
Nodes (4): adjustStock(), handleMenuAction(), setMinimumStock(), viewHistory()

### Community 178 - "Transactions 5"
Cohesion: 0.67
Nodes (3): PriceSource, CartItem, CartItem

## Ambiguous Edges - Review These
- `Ucup Kasir App Logo (SVG icon asset)` → `Filename 'gemini-svg' Mismatch (content is Ucup Kasir branding)`  [AMBIGUOUS]
  assets/gemini-svg.svg · relation: conceptually_related_to
- `Blue Gradient Brand Background` → `Point of Sale / Sales-Billing App Identity`  [AMBIGUOUS]
  assets/image.png · relation: conceptually_related_to

## Knowledge Gaps
- **8 isolated node(s):** `DataTable actions Slot`, `DataTable cell-{key} Slot`, `DataTable rowActions Slot`, `Custom Cell Format Function`, `Dark Navy Squircle Icon Container` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2657 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `router` connect `Router & Breadcrumb` to `Add Transaction Form`, `Add Transaction From Home`, `Product List CRUD`, `Customer List CRUD`, `Transaction Detail`, `Auto Navigation Stack`, `Trial Balance`, `Invoice Detail`, `Transaction List`, `Store Settings & Sync Log`, `Startup Log & Layout`, `Navigation Stack Manager`, `DB Migration Tools`, `Category List CRUD`, `Stock Management`, `Customer Transaction Form`, `General Ledger`, `Journal List`, `Group Price List`, `Invoice Print`, `Delivery Order Form`, `Customer Invoice List`, `Customer Detail`, `Group Price Form`, `Tier Price List`, `Delivery Order Print`, `Aging Receivables`, `Finance Dashboard`, `Customer Price Form`, `Stock Movements`, `Event Logging`, `Dashboard Stats`, `Settings`, `Pricematrix`, `Products`, `Ecommerce`, `Hr`, `Pricematrix 2`, `Settings 2`, `Finance`, `Hr 2`, `Pricematrix 3`, `Products 2`, `Reports 2`, `Reports 3`, `Transactions`, `Settings 3`, `Pricematrix 4`, `Quickmenu`, `Shipping`, `Finance 2`, `Hr 3`, `Shipping 2`, `Purchasing`, `Reports 4`, `Finance 3`, `Finance 4`, `Hr 4`, `Returns`, `Finance 6`, `Reports 6`, `Stock 3`, `Notifications`, `Purchasing 2`, `Purchasing 3`, `Reports 8`, `Invoices`, `Hr 5`, `Reports 9`, `Finance 7`, `Shipping 3`, `Shipping 4`, `Purchasing 4`, `Purchasing 5`, `Customers`, `Purchasing 6`, `Purchasing 7`, `Categories`, `Purchasing 8`, `Purchasing 9`, `Settings 4`, `Purchasing 10`, `Purchasing 11`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `DataTable actions Slot`, `DataTable cell-{key} Slot`, `DataTable rowActions Slot` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Add Transaction Form` be split into smaller, more focused modules?**
  _Cohesion score 0.042606516290726815 - nodes in this community are weakly interconnected._
- **Why does `useToast()` connect `Settings 2` to `Add Transaction Form`, `Settings 4`, `Product List CRUD`, `Add Transaction From Home`, `Customer List CRUD`, `Transaction Detail`, `Finance 8`, `Auto Navigation Stack`, `Trial Balance`, `Invoice Detail`, `Purchasing 10`, `Store Settings & Sync Log`, `Router & Breadcrumb`, `Transaction List`, `DB Migration Tools`, `Category List CRUD`, `Stock Management`, `Customer Transaction Form`, `Journal List`, `Group Price List`, `Delivery Order Form`, `Customer Invoice List`, `Customer Detail`, `Group Price Form`, `Tier Price List`, `Usefinancialstatementpdf`, `Usepayrollslippdf`, `Finance Dashboard`, `Customer Price Form`, `Delivery Order Print`, `Stock Movements`, `Dashboard Stats`, `Settings`, `Pricematrix`, `Products`, `Pricematrix 2`, `Finance`, `Hr 2`, `Pricematrix 3`, `Products 2`, `Reports 2`, `Settings 3`, `Pricematrix 4`, `Shipping`, `Hr 3`, `Shipping 2`, `Purchasing`, `Finance 3`, `Finance 4`, `Hr 4`, `Finance 5`, `Finance 6`, `Stock 3`, `Purchasing 2`, `Invoices`, `Hr 5`, `Reports 9`, `Hr 6`, `Usedeliveryorderpdf`, `Finance 7`, `Shipping 3`, `Shipping 4`, `Purchasing 4`, `Customers`, `Purchasing 7`, `Categories`, `Purchasing 8`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Add Transaction From Home` be split into smaller, more focused modules?**
  _Cohesion score 0.04350649350649351 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Ucup Kasir App Logo (SVG icon asset)` and `Filename 'gemini-svg' Mismatch (content is Ucup Kasir branding)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Blue Gradient Brand Background` and `Point of Sale / Sales-Billing App Identity`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._