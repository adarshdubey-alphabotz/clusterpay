import App from './App.jsx';
import GhostPage from './GhostPage.jsx';

export default function RootPage() {
  const path = window.location.pathname;
  return path.includes('/ghost') ? <GhostPage /> : <App />;
}
