import './App.css';
import {
    Admin,
    Resource,
} from 'react-admin';
import { authProvider, cosmoDataProvider } from './NetworkMgr';
import Keys from './Manage/Keys';
import LoginWithTheme from './Login/Login';

function App() {
//1231231231231231231231
//2222222ee

    return  (
        <Admin dataProvider={cosmoDataProvider}
            authProvider={authProvider}
            loginPage={LoginWithTheme}>
            <Resource name="Encryption" options={{ label: '金鑰列表' }} {...Keys} />
        </Admin>
    );
}

export default App;
