/* eslint-disable import/no-anonymous-default-export */
import {
    Create,
    Datagrid,
    Edit,
    EditButton,
    List,
    ResourceComponentProps,
    SimpleForm,
    TextField,
    TextInput
} from "react-admin";

const validateKeyLength = (values: { key: any; }) => {
    const errors: { key?: string } = {};

    if (!values.key) {
        errors.key = '金鑰必填';
    }

    if (values.key && values.key.length !== 32) {
        errors.key = '金鑰須為長度32字串';
    }

    return errors
};

function keyList(props: ResourceComponentProps) {
    return (
        <List title="金鑰列表" bulkActionButtons={false} {...props}>
            <Datagrid>
                <TextField source="id" label="版本" />
                <TextField source="key" label="金鑰" />
                <EditButton label="預覽與更新" />
            </Datagrid>
        </List>
    )
}

function keyCreate(props: ResourceComponentProps) {

    return (
        <Create title="新增金鑰" {...props}>
            <SimpleForm validate={validateKeyLength}>
                <TextInput fullWidth={true} source="key" label="金鑰" defaultValue={generateKey()} />
            </SimpleForm>
        </Create>
    );
}

function keyEdit(props: ResourceComponentProps) {

    return (
        <Edit title="金鑰資訊更新" {...props}>
            <SimpleForm validate={validateKeyLength}>
                <TextInput disabled source="id" label="版本" />
                <TextInput fullWidth={true} source="key" label="金鑰" />
            </SimpleForm>
        </Edit>
    );
}

function generateKey(len: number = 32) {

    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
}

export default {
    list: keyList,
    create: keyCreate,
    edit: keyEdit
}