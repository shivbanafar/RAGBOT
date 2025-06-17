declare const router: import("express-serve-static-core").Router;
declare global {
    var inMemoryUsers: Map<string, any>;
}
export default router;
