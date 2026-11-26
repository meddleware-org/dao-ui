// Library entry point. Hosts (e.g. the dashboard) import DaoView to render the DAO
// console inline against a shared wallet. DaoView self-imports its scoped qt.css.
// The one export: the console view, for a host to render inline.
export { default as DaoView } from './DaoView.vue'
