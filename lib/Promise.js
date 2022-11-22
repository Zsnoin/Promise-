/*

自定义Promise模块: IIFE
*/
(function (window) {
    /*
    Promise函数
    执行器函数: excutor(同步)
    */
    function Promise(excutor) {
        //将当前that保存起来
        const that = this
        that.status = 'pending'  //用来存储状态
        that.data = undefined    //用来存储结果数据
        that.callbacks = []      //每个元素的结构：{ onResolved(){} , onRejected(){} }
        function resolve(value) {
            //如果当前状态不是pending，直接结束
            if (that.status !== 'pending') {
                return
            }

            //将状态改为resolved
            that.status = 'resolved'
            //保存value的值
            that.data = value

            //如果有待执行的callback函数，立即异步执行回调函数onResolved
            if (that.callbacks.length > 0) {
                setTimeout(() => {      //模拟异步执行 放入队列中执行所有的回调
                    that.callbacks.forEach(callbacksObj => {    //遍历出来的是一个对象
                        callbacksObj.onResolved(value)
                    })
                }, 0);
            }
        }
        function reject(reason) {
            //如果当前状态不是pending，直接结束
            if (that.status !== 'pending') {
                return
            }

            //将状态改为rejected
            that.status = 'rejected'
            //保存reason的值
            that.data = reason

            //如果有待执行的callback函数，立即异步执行回调函数onRejected
            if (that.callbacks.length > 0) {
                setTimeout(() => {      //模拟异步执行 放入队列中执行所有的回调
                    that.callbacks.forEach(callbacksObj => {    //遍历出来的是一个对象
                        callbacksObj.onRejected(reason)
                    })
                }, 0);
            }
        }

        //立即执行excutor
        //如果执行器抛出异常，捕获异常，promise对象变为失败
        try {
            excutor(resolve, reject)
        } catch (error) {
            reject(error)
        }
    }

    /*
    Promise原型对象的then()
    指定成功和失败的回调函数
    返回一个新的promise对象
    */
    Promise.prototype.then = function (onResolved, onRejected) {

        onResolved = typeof onResolved === 'function' ? onResolved : value => value  //向后传递成功的value
        //指定默认的失败的回调(实现错误/异常穿透的关键点)
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }

        const that = this

        //返回一个新的Promise
        return new Promise((resolve, reject) => {
            //调用指定的回调函数处理
            function handle(callback) {
                /*
                1、如果抛出异常，return的promise就会失败，reason就是error。
                2、如果回调函数返回的不是promise，return的promise就是会成功，value就是返回的值。
                3、如果回调函数返回的值是promise，return的promise的结果就是这个promise的结果。
                */
                try {
                    const result = callback(that.data)
                    //instanceof是Java中的二元运算符，左边是对象，右边是类；
                    //当对象是右边类或子类所创建对象时，返回true；否则，返回false。
                    if (result instanceof Promise) {
                        //如果回调函数返回的值是promise，return的promise的结果就是这个promise的结果。
                        result.then(
                            value => resolve(value),    //当result成功时，让return的promise成功
                            reason => reject(reason)    //当result失败时，让return的promise失败
                        )
                        // result.then(resolve,reject)  //简写
                    } else {
                        //如果回调函数返回的不是promise，return的promise就是会成功，value就是返回的值。
                        resolve(result)
                    }
                } catch (error) {
                    reject(error)
                }
            }
            if (that.status === 'pending') {
                //当前状态还是pending状态，将回调函数保存起来
                that.callbacks.push({
                    onResolved(value) {
                        handle(onResolved)
                    },
                    onRejected(reason) {
                        handle(onRejected)
                    }
                })
            } else if (that.status === 'resolved') {
                //当前是resloved状态，异步执行onResolved并改变return的promise状态
                setTimeout(() => {
                    handle(onResolved)
                }, 0);
            } else {  //rejected
                //当前是rejected状态，异步执行onRejected并改变return的promise状态
                setTimeout(() => {
                    handle(onRejected)
                }, 0);
            }
        })
    }

    /*
    Promise原型对象的catch()
    指定失败的回调函数
    返回一个promise对象
    */
    Promise.prototype.catch = function (onRejected) {
        return this.then(null, onRejected)
    }

    /* 
    Promise函数对象的resolve方法
    返回一个指定结果成功的promise
    */
    Promise.resolve = function (value) {
        //返回成功或者失败的promise
        return new Promise((resolve, reject) => {

            if (value instanceof Promise) {
                //value是promise
                //使用value的结果作为promise的结果
                value.then(resolve, reject)
            } else {
                // value不是promise  promise变为成功
                resolve(value)

            }
        })
    }

    /* 
    Promise函数对象reject方法
    返回一个指定reason的失败的promise
    */
    Promise.reject = function (reason) {
        //返回失败的promise
        return new Promise((resolve, reject) => {
            reject(reason)
        })
    }

    /* 
    Promise函数对象的all方法
    返回一个promise，只有当所有promise都成功时才成功，否则失败。
    */
    Promise.all = function (promises) {
        //用来保存所有成功value的数组
        const values = new Array(promises.length)
        //用来保存成功的promise数量
        let num = 0

        //返回一个新的promise
        return new Promise((resolve, reject) => {
            //遍历获取每个promise的结果
            promises.forEach((p, index) => {
                Promise.resolve(p).then(
                    value => {
                        //p成功，将成功的值保存到vlaues
                        //按照promise的顺序存储
                        num++
                        values[index] = value

                        //如果全部成功，将return的promise改变成功
                        if (num === promises.length) {
                            resolve(values)
                        }
                    },
                    reason => {
                        //只要有一个失败，return的promise就失败
                        reject(reason)
                    }
                )
            })
        })
    }

    /* 
    Promise函数对象的race方法
    返回一个promise，其结果由第一个完成的promise决定。
    */
    Promise.race = function (promises) {
        return new Promise((resolve, reject) => {
            //遍历获取每个promise的结果
            promises.forEach((p, index) => {
                Promise.resolve(p).then(
                    value => {
                        //一旦有成功了，将return变为成功
                        resolve(value)
                    },
                    reason => {
                        //一旦有失败了，将return变为失败
                        reject(reason)
                    }
                )
            })
        })
    }

    //返回一个promise对象，他在指定的时间后才确定结果
    Promise.resolveDelay = function (value, time) {
        //返回一个成功或者失败的promise
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (value instanceof Promise) {
                    //value是promise
                    //使用value的结果作为promise的结果
                    value.then(resolve, reject)
                } else {
                    // value不是promise  promise变为成功
                    resolve(value)

                }
            }, time)
        })
    }

    //返回一个promise对象，他在指定时间后才失败。
    Promise.rejectDelay = function (reason, time) {
        
            //返回失败的promise
            return new Promise((resolve, reject) => {
                setTimeout(()=>{
                    reject(reason)
                },time)
            })
    }

    // 向外暴露Promise函数
    window.Promise = Promise
})(window)
