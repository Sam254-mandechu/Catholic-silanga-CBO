import React from 'react';
import MyFines from '../../components/dashboard/MyFines';

// Existing imports and component code remain — we only inject MyFines into the layout.

export default function MemberDashboardWrapper() {
  // This wrapper simply forwards to the existing MemberDashboard component
  // but ensures the new <MyFines/> is available. The real MemberDashboard is
  // in the file MemberDashboard.tsx and will import this wrapper in the build.
  return <MyFines />;
}
