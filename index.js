import { all, takeEvery } from "redux-saga/effects"
import { connect as react_redux_connect } from "react-redux"

const createMsg = (namespace, type) => {
    const key = namespace + '/' + type
    var build = payload => ({...payload, type: key })
    build.key = key
    return ({ key: type, build: build })
}

export const createMsgs = (namespace, names) =>
    names
        .map (_ => createMsg (namespace, _))
        .reduce ((acc, x) => ({...acc, [x.key]: x.build }), {})

export const buildStores = (current_reducers, stores) => {

    if (! Array.isArray (stores))
        throw new Error ("Expected 2nd parameter to be an array of stores")

    stores.forEach ((s, index) => {
        if (typeof s !== "object" || typeof s.namespace !== "string" || typeof s.update !== "function" || ! Array.isArray (s.cmd))
            throw new Error (`Invalid store at index ${index}. Expected an object { namespace: String, update: Function, cmd: [(Msg, Function *)] }`)
    })

    const cmds = stores.filter (_ => _.cmd).map(_ => _.cmd)
    const reducers = stores.reduce ((acc, store) => {
        return { ...acc, [store.namespace]: store.update }
    }, current_reducers)
    return { cmds, reducers }
}

export const registerCmds = (xs, storeIndex = '?') => {

    if (! Array.isArray (xs))
        throw new Error ("Expected input to be an array of arrays with 2 elements each [msg, function *]")

    xs.forEach ((row, index) => {
        if (! Array.isArray (row))
            throw new Error (`Expected row to be an array [msg, function *], at store index ${storeIndex} and row index ${index}`)
        else if (typeof row[0] !== "function" || typeof row[0].key !== "string")
            throw new Error (`Expected row first element to be a valid msg from a Msg collection created with createMsgs, at store index ${storeIndex} and row index ${index}`)
        else if (row.length !== 2)
            throw new Error (`Expected row to have 2 elements, at store index ${storeIndex} and row index ${index}`)
    })

    return function * () {
        yield all (xs.map (([msg, cmd]) => {
            return takeEvery (msg.key, cmd)
        }))
    }
}

export const connect = (modelToProps, msgToProps, merge, options) =>
    react_redux_connect (
        typeof modelToProps === "string" ? (m => m[modelToProps]) : modelToProps,
        msgToProps,
        merge || ((m, msg, props) => ({ m, msg, props })),
        options )
