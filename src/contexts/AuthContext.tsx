*** Begin Patch
*** Update File: src/contexts/AuthContext.tsx
@@
 interface AuthContextType {
@@
   isAdmin: () => boolean;
+  isTreasurer: () => boolean;
+  isFinancePrivileged: () => boolean;
   isMember: () => boolean;
   needsEmailVerification: () => boolean;
 }
@@
-  const isAdmin = (): boolean => profile?.role === ('admin' as Role);
-  const isMember = (): boolean => profile?.role === 'admin' || profile?.role === 'member';
+  const isAdmin = (): boolean => profile?.role === ('admin' as Role);
+  const isTreasurer = (): boolean => profile?.role === ('treasurer' as Role);
+  const isFinancePrivileged = (): boolean => isAdmin() || isTreasurer();
+  const isMember = (): boolean => profile?.role === 'admin' || profile?.role === 'member';
@@
-    isAdmin,
-    isMember,
+    isAdmin,
+    isTreasurer,
+    isFinancePrivileged,
+    isMember,
*** End Patch
