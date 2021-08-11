import { DeleteItemCommand, DeleteItemCommandOutput, GetItemCommand, GetItemCommandOutput, PutItemCommand, PutItemCommandOutput, ScanCommand, ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import database from './DBClient';
import Config from './../config';

export default class ModelBase {

    tableName: string = Config.tableName;

    async getList(query: any) {

        const { range } = query;

        const limit = range[1] - range[0];
        const startKey = range[0];

        try {
            // query to return all items
            const command = new ScanCommand({
                TableName: this.tableName,
                FilterExpression: "version > :v",
                ExpressionAttributeValues: {
                    ":v": { N: "0" }
                },
                ExclusiveStartKey: startKey || undefined,
                Limit: limit
            });

            const res = await database?.send(command);
            const { Items: results, Count: num } = res as ScanCommandOutput;

            return {
                count: num,
                data: results?.map(item => ({
                    id: item.version.N,
                    key: item.key.S
                }))
            }
        } catch (error) {
            console.error(error);
        }
    }

    async getOne(id: string) {
        try {
            const command = new GetItemCommand({
                TableName: this.tableName,
                Key: {
                    id: { S: "PK" },
                    version: { N: `${ id }` }
                }
            });
            const { Item: result } = await database?.send(command) as GetItemCommandOutput;

            return {
                data: {
                    id: result?.version.N,
                    key: result?.key.S
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    async create(data: any) {
        try {
            // Get max version number
            const max = new GetItemCommand({
                TableName: this.tableName,
                Key: {
                    id: { S: "autoIncrease" },
                    version: { N: "-1" }
                }
            });
            const { Item: result } = await database?.send(max) as GetItemCommandOutput;

            let maxNum = NaN;
            if (result) {
                if (result.key.S != null) maxNum = parseInt(result.key.S);
                if (!isNaN(maxNum)) {
                    maxNum += 1;
                }
                else {
                    throw new Error("autoIncrease data error!");
                }
            }
            else {
                maxNum = 1
            }

            // Update max version number
            const res = await database?.send(new PutItemCommand({
                TableName: this.tableName,
                Item: {
                    id: { S: "autoIncrease" },
                    key: { S: `${ maxNum }` },
                    version: { N: "-1" }
                }
            })) as PutItemCommandOutput;

            if (res) {
                const command = new PutItemCommand({
                    TableName: this.tableName,
                    Item: {
                        id: { S: "PK" },
                        key: { S: data.key },
                        version: { N: `${ maxNum }` },
                    },
                    ConditionExpression: `attribute_not_exists(id)`
                });
                const res = await database?.send(command) as PutItemCommandOutput;

                if (res) {
                    return {
                        data: {
                            id: maxNum,
                            key: data.key
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }

        return null;
    }

    async update(data: any, options: Object = {}) {
        try {

            const command = new PutItemCommand({
                TableName: this.tableName,
                Item: {
                    id: { S: "PK" },
                    key: { S: data.key },
                    version: { N: `${ data.id }` },
                }
            });
            const res = await database?.send(command) as PutItemCommandOutput;

            if (res) {
                return {
                    data: data
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    async delete(id: string) {
        try {
            const command = new DeleteItemCommand({
                TableName: this.tableName,
                Key: {
                    id: { S: "PK" },
                    version: { N: `${ id }` }
                },
                ReturnValues: "ALL_OLD"
            })
            const { $metadata: status, Attributes: data } = await database?.send(command) as DeleteItemCommandOutput;

            if (status.httpStatusCode === 200 && data) {
                return {
                    data: {
                        id: data.version.N,
                        key: data.key.S,
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }

        return null;
    }
}