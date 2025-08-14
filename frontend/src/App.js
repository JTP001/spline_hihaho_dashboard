import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { VideoFilterProvider } from './context/VideoFilterContext';
import Register from './pages/Register';
import Users from './pages/Users';
import Login from './pages/Login';
import Summary from './pages/Summary';
import Interactions from './pages/Interactions';
import Questions from './pages/Questions';
import MonthlyView from './pages/MonthlyView';
import Settings from './pages/Settings';
import SessionsView from './pages/SessionsView';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <VideoFilterProvider>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<Summary />}></Route>
            <Route path='/summary/' element={<Summary />}></Route>
            <Route path='/interactions/' element={<Interactions />}></Route>
            <Route path='/questions/' element={<Questions />}></Route>
            <Route path='/monthlyview/' element={<MonthlyView />}></Route>
            <Route path='/sessionsview/' element={<SessionsView />}></Route>
            <Route path='/login/' element={<Login />}></Route>
            <Route path='/register/' element={<Register />}></Route>
            <Route path='/users/' element={<Users />}></Route>
            <Route path='/user/update/' element={<Settings />}></Route>
          </Routes>
        </BrowserRouter>
      </VideoFilterProvider>
    </LocalizationProvider>
  );
}

export default App;
