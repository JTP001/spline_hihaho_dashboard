import HihahoSidebar from "./HihahoSidebar";

function Layout({ children }) {
  return (
    <div className="d-flex">
      {/* Sidebar */}
      <HihahoSidebar/>

      {/* Page Content */}
      <div className="flex-grow-1 p-3">{children}</div>
    </div>
  );
}

export default Layout;