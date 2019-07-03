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

export const registerCmds = xs => {

    if (! Array.isArray (xs) || xs.length === 0)
        throw new Error ("Expected input to be an array with 2 elements [msg, function *]")

    if (xs.length !== 2)
        throw new Error (`Expected input to have 2 elements, at msg ${xs[0]}`)

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
