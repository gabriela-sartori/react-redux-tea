import { combineReducers } from "redux"
import { Provider as react_redux_provider , connect as react_redux_connect } from "react-redux"
import { all, takeEvery } from "redux-saga/effects"

// Exporting Provider from react-redux, so it is not needed to import react-redux in every project
export const Provider = react_redux_provider

// Exporting connect from react-redux but with some facilities
export const connect = (modelToProps, msgToProps, merge, options) =>
    react_redux_connect (
        typeof modelToProps === "string" ? (m => m[modelToProps]) : modelToProps,
        msgToProps,
        merge || ((m, msg, props) => ({ m, msg, props })),
        options )

// Create messages creators with namespace, to use in reducer without conflicts
// type alias Msg payload = { payload | type : String }
// createMsgs :: String -> List String -> Dict String Msg
export const createMsgs = (namespace, msgNames) =>
    msgNames
        .reduce((acc, msgName) => {
            const key = `${namespace}/${msgName}`
            let constructor = payload => ({ type: key, ...payload })
            constructor.key = key
            return { ...acc, [msgName]: constructor }
        }, {})

// type alias MsgKey = KeyMsg Msg | KeyStr String
// type alias CmdDecl = (MsgKey, Generator)
// store_cmds_to_generator :: List CmdDecl -> Int -> Generator
const store_cmds_to_generator = (cmdDeclarations, storeName = "?", storeIndex = "?") => {

    if (! Array.isArray (cmdDeclarations))
        throw new Error ("Expected input to be an array of arrays with 2 elements each [msg, function *]")

    cmdDeclarations.forEach ((row, index) => {
        const where = `at store { name: "${storeName}", row: ${index}, index ${storeIndex} }`
        if (! Array.isArray (row))
            throw new Error (`Expected row to be an array [msg, function *], ${where}`)
        else if (typeof row[0] !== "string" && (typeof row[0] !== "function" || typeof row[0].key !== "string"))
            throw new Error (`Expected row first element to be a string or a valid msg creator from createMsgs, ${where}`)
        else if (row.length !== 2)
            throw new Error (`Expected row to have 2 elements, ${where}`)
    })

    return function * () {
        yield all (cmdDeclarations.map (([msgKey, cmd]) => takeEvery (typeof msgKey === "string" ? msgKey : msgKey.key, cmd)))
    }
}

// type alias Reducer model = model -> Msg -> model
// type alias Store model = { namespace : String, update : Reducer model, cmd : List CmdDecl }
// type ReduxStore
// buildStores :: Dict String Reducer -> List Store -> { cmds : List Generator, reducer : ReduxStore }
export const buildStores = (staticReducers, stores) => {

    if (! Array.isArray (stores))
        throw new Error ("Expected 2nd parameter to be an array of stores")

    stores.forEach ((s, index) => {
        if (typeof s !== "object" || typeof s.namespace !== "string" || typeof s.update !== "function" || ! Array.isArray (s.cmd))
            throw new Error (`Invalid store at index ${index}. Expected an object { namespace : String, update : Function, cmd : [( Msg, Generator )] }`)
    })

    const reducer = combineReducers(stores.reduce ((acc, store) => ({ ...acc, [store.namespace]: store.update }), staticReducers))
    const setupStore = sagaMiddleware =>
        stores
            .filter (_ => _.cmd)
            .map((store, index) => store_cmds_to_generator (store.cmd, storeName, index))
            .forEach(generator => sagaMiddleware.run(generator))
    
    return { setupStore, reducer }
}
