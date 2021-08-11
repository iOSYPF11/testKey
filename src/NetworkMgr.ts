import { AuthenticationDetails, CognitoUser, CognitoUserPool, ICognitoUserData } from "amazon-cognito-identity-js";
import { GET_LIST, GET_ONE, CREATE, UPDATE, DELETE, DELETE_MANY, GET_MANY, GET_MANY_REFERENCE, AuthActionType, AUTH_LOGOUT, AUTH_LOGIN, AUTH_CHECK } from "react-admin";
import { initDB } from "./Models/DBClient";
import ModelBase from './Models/ModelBase';
import Config from './config';
import { waitSec } from './Util';
import jwt_decode from "jwt-decode";

export interface AdminData {
    type: string,
    resource: string,
    data: any
}

let modelMap: { [key: string]: ModelBase } = {
    Encryption: new ModelBase()
}
let userPool = new CognitoUserPool({
    UserPoolId: Config.userPoolId,
    ClientId: Config.ClientId
})

async function cognitoLogin(params: any) {

    return new Promise((resolve, reject) => {
        const authenticationDetails = new AuthenticationDetails({
            Username: params.username,
            Password: params.password,
        });

        const userData: ICognitoUserData = {
            Username: params.username,
            Pool: userPool
        };
        const cognitoUser = new CognitoUser(userData);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                // console.log("auth", result)

                const idToken = result.getIdToken().getJwtToken();
                const decoded = jwt_decode(idToken) as any;

                // Check user is in admin group
                if (decoded.hasOwnProperty("cognito:groups") && (decoded["cognito:groups"] as Array<any>).includes("AdminGroup")) {
                    resolve(btoa(idToken));
                }
                else {
                    reject(null);
                }
            },
            newPasswordRequired: function (userAttributes, requiredAttributes) {
                // User was signed up by an admin and must provide new
                // password and required attributes, if any, to complete
                // authentication.

                // the api doesn't accept this field back
                delete userAttributes.email_verified;

                // unsure about this field, but I don't send this back
                delete userAttributes.phone_number_verified;

                delete userAttributes.email;

                // Get these details and call
                cognitoUser.completeNewPasswordChallenge(params.password, userAttributes, this);
                reject("Change password!");
            },
            onFailure: (err) => {
                console.error(err);
                reject(null);
            }
        });
    })
}

function getSession() {
    return new Promise((resolve, reject) => {
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser != null) {
            cognitoUser.getSession((err: any, s: any) => {
                if (err) {
                    console.error("Get Session", err);
                    alert("Something error");
                    reject();
                }
                resolve(btoa(s.getIdToken().getJwtToken() as string));
            });
        }
        else {
            reject();
        }
    });
}

export async function authProvider(type: AuthActionType, params?: any) {
    switch (type) {
        case AUTH_LOGIN:
            try {
                const idToken = await cognitoLogin(params);

                if (idToken) {
                    if (idToken === "Change password!") return Promise.reject("Change password!");
                    // accept all username/password combinations   
                    localStorage.setItem("logined", idToken as string);
                    initDB("AUTH_LOGIN");

                    await waitSec(0.5);
                    return Promise.resolve();
                }

            } catch (error) {
                console.error(error);
            }
            return Promise.reject();
        case AUTH_LOGOUT:
            localStorage.removeItem('logined');
            userPool.getCurrentUser()?.signOut();

            return Promise.resolve();
        case AUTH_CHECK:
            if (localStorage.getItem("logined") == null) {
                return Promise.reject();
            }

            // refresh token if token changed.
            const res = await getSession();
            if (res && res !== localStorage.getItem("logined")) {

                localStorage.setItem("logined", res as string);
                window.location.reload();
            }

            return res ? Promise.resolve() : Promise.reject();
        default:
            return Promise.resolve();
    }
}

export async function cosmoDataProvider(type: string, resource: string, params: any) {
    let data: AdminData = {
        type: type,
        resource: resource,
        data: {}
    };

    switch (type) {
        case GET_LIST:
            {
                const { page, perPage } = params.pagination;
                const { field, order } = params.sort;
                const query = {
                    sort: [field, order],
                    range: [
                        (page - 1) * perPage,
                        page * perPage,
                    ]
                };
                data.data = query;
            }
            break;
        case GET_ONE:
            data.data = { id: params.id };
            break;
        case CREATE:
            data.data = params.data;
            break;
        case UPDATE:
            data.data = { id: params.id, ...params.data };
            break;
        case DELETE:
            data.data = { id: params.id };
            break;
        case DELETE_MANY:
            data.data = { ids: params.ids };
            break;
        case GET_MANY: {
            data.data = { ids: params.ids };
            break;
        }
        case GET_MANY_REFERENCE: {
            const { page, perPage } = params.pagination;
            const { field, order } = params.sort;
            const query = {
                sort: JSON.stringify([field, order]),
                range: JSON.stringify([
                    (page - 1) * perPage,
                    page * perPage - 1,
                ]),
                filter: JSON.stringify({
                    ...params.filter,
                    [params.target]: params.id,
                }),
            };
            data.data = query;
            break;
        }
        default:
            throw new Error(`Unsupported Data Provider request type ${ type }`);
    }

    return modelSwitch(data)
        .then((res) => {
            // log.log(res);
            switch (type) {
                case GET_LIST:
                    return {
                        data: res.data,
                        total: parseInt(res.count, 10)
                    };
                case CREATE:
                    return { data: { ...params.data, id: res.data.id } };
                default:
                    return { data: res.data };
            }
        })
}

function modelSwitch(m_data: AdminData) {

    return new Promise<any>((resolve, reject) => {

        const { type, resource, data } = m_data;
        const model = modelMap[resource];
        if (!model) {
            reject();
        }

        switch (type) {
            case GET_LIST:
                model.getList(data)
                    .then((res) => {
                        console.log('GetList', res);
                        if (res) {
                            resolve(res);
                        }
                        else {
                            reject();
                        }

                    });
                break;
            case GET_ONE:
                model.getOne(data.id)
                    .then((res) => {
                        console.log('GetOne', res);
                        if (res) {
                            resolve(res);
                        }
                        else {
                            reject();
                        }
                    });
                break;
            case CREATE:
                model.create(data)
                    .then(res => {
                        console.log('Create', res);
                        if (res) {
                            resolve(res);
                        }
                        else {
                            reject();
                        }
                    });
                break;
            case UPDATE:
                model.update(data.id, data)
                    .then(res => {
                        console.log('Update', res);
                        if (res) {
                            resolve(res);
                        }
                        else {
                            reject();
                        }
                    });
                break;
            case DELETE:
                model.delete(data.id)
                    .then(res => {
                        console.log('Delete', res);
                        if (res) {
                            resolve(res);
                        }
                        else {
                            reject();
                        }
                    });
                break;
            case GET_MANY:
                break;
            default:

        }
    })
}