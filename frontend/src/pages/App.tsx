import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '../context/AuthContext';
import { AppShell } from '../components/AppShell';
import { ProtectedRoute } from '../components/ProtectedRoute';

import { LoginPage } from './LoginPage';
import { OverviewPage } from './OverviewPage';
import { ComposePage } from './ComposePage';
import { EmailListPage } from './EmailListPage';
import { SettingsPage } from './SettingsPage';


const client=new QueryClient({defaultOptions:{queries:{refetchOnWindowFocus:false,retry:1}}});
export default function App(){
 return <QueryClientProvider client={client}><BrowserRouter><AuthProvider><Routes>
  <Route path="/login" element={<LoginPage/>}/>
  <Route element={<ProtectedRoute/>}><Route element={<AppShell/>}><Route index element={<OverviewPage/>}/><Route path="/compose" element={<ComposePage/>}/><Route path="/scheduled" element={<EmailListPage kind="scheduled"/>}/><Route path="/sent" element={<EmailListPage kind="sent"/>}/><Route path="/settings" element={<SettingsPage/>}/></Route></Route>
 </Routes></AuthProvider></BrowserRouter></QueryClientProvider>;
}
