import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"; // ES6 import
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import Config from '../config';

let database: DynamoDBClient | null = null;

export function initDB(ctx: string = "") {

    const cookie = localStorage.getItem("logined");
    try {
        if (cookie == null) {
            return
        }
        let loginMap: Record<string, string> = {};
        loginMap[`cognito-idp.${ Config.region }.amazonaws.com/` + Config.userPoolId] = atob(cookie);

        // console.log(endpoint, key);    
        database = new DynamoDBClient({
            region: Config.region,
            credentials: fromCognitoIdentityPool({
                client: new CognitoIdentityClient({ region: Config.region }),
                identityPoolId: Config.identityPoolId,
                logins: loginMap,
            })
        });

        console.log("DB_" + ctx, database);

    } catch (error) {
        console.error(error)
    }
}

initDB();
export default database;
