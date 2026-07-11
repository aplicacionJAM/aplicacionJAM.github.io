window.STORAGE_KEYS = {
    productos: 'jam_pos_productos', clientes: 'jam_pos_clientes', proveedores: 'jam_pos_proveedores',
    gastos: 'jam_pos_gastos', empleados: 'jam_pos_empleados', ventas: 'jam_pos_ventas',
    config: 'jam_pos_config', session_cart: 'jam_pos_cart', session_meta: 'jam_pos_meta'
};
window.DATA_STORES = ['productos', 'clientes', 'proveedores', 'gastos', 'empleados', 'ventas'];
window.MODULOS_SIDEBAR = [
    { icon: "fa-shopping-cart", label: "Ventas", id: "ventas" }, { icon: "fa-boxes", label: "Inventario", id: "inventario" },
    { icon: "fa-users", label: "Clientes", id: "clientes" }, { icon: "fa-truck", label: "Proveedores", id: "proveedores" },
    { icon: "fa-coins", label: "Gastos", id: "gastos" }, { icon: "fa-user-tie", label: "Empleados", id: "empleados" },
    { icon: "fa-chart-line", label: "Reportes", id: "reportes" }, { icon: "fa-palette", label: "Config", id: "config" }
];
