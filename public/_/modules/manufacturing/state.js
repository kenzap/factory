export const state = {
    filters: {
        for: "manufacturing",
        client: {},
        dateFrom: '',
        dateTo: '',
        items: true,
        limit: 1000,
        offset: 0,
        sort_by: null,
        sort_dir: null,
        type: '' // Default to 'All'
    },
    user: {},
    settings: {},
    orders: { records: [], total: 0 },
    inQuery: false,
    mode: ''
};