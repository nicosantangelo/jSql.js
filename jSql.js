//http://jsbin.com/emajaj/3/edit
//TODO:
//      arreglar merge para singleObj
//      ¿Agregar remove y update?
//      Robar métodos de aca http://msdn.microsoft.com/en-us/library/bb738550.aspx
(function(window, undefined) {
    //Metodos usados dentro de jSql, pero no expuestos
	
    //
    //Une las propiedades del obj2 en obj y lo retorna
    var mergeProperties =  function(obj, obj2) {
        var name;
        if (obj !== undefined && obj !== null) {
            for (name in obj2) {
                if(obj2.hasOwnProperty(name)) {
                    if (obj === obj2[name]) {
                        continue;
                    }
                    if (obj2[name] !== undefined) {
                        if(obj.element && obj2 !== this) {
                            obj.element[name] = obj2[name];
                        }
                        else {
                            obj[name] = obj2[name];
                        }
                    }
                }
            }
        }
        else {
            return obj2;
        }
        return obj;
    },
    //
    //Une cualquier cantidad de arrays pasados por parámetro
    mergeArrays = function() {
        var argumentArray = Array.prototype.slice.call(arguments),
            returnArray = [], totalLen = argumentArray.length, i = 0;

		while(argumentArray[i] && !argumentArray[i].length) { i++; }
		
		if(argumentArray[i]) {
            for (  ; i < totalLen ; i++) {
                Array.prototype.push.apply(returnArray, argumentArray[i]);
            }
        }
        else {
            argumentArray = [];
        }
        return returnArray;
    },
    //
    //Retorna el maximo o minimo de una coleccion (usa forEach)
    minOrMax = function(objToSearch, selector, isMax) {
        var aux, auxFunc;
        if(objToSearch) {
            auxFunc = function() {
                    if(isMax) {
                        return function(a, b) { return a > b; };
                    }
                    else {
                        return function(a, b) { return a < b; };
                    }
            }();
            if(selector) {
                objToSearch = jSql.from(objToSearch).select(selector);
            }
            jSql.forEach(objToSearch, function(i) {
                if(!aux || auxFunc(this[i], aux)) {
                    aux = this[i];
                }
            }, true);
        }
        return aux;
    },
    
    //Objeto Global
    jSql = (function() {
        //
        //Retorna una nueva instancia de jSql
        var jSql = function(element) {
            return new jSql.prototype.Instance(element);
        },
        //
        //Ejetuca un metodo pasado por parametro usando obj como this
		executeMethod = function(meth, obj) {
		    var args = Array.prototype.slice.call(arguments);
			return jSql.prototype[meth].apply(obj, args);
		};

        //Metodos de una instancia
        jSql.prototype = {
            constructor: jSql,
            //
            //Asigna y retorna una instancia de jSql
            Instance: function(el, type) {
                this.element = el;
                this.type = (!type) ? jSql.detectType(el) : type;
                //this.obj = (this.type !== "multiObj") ? jSql.arrayToObj(el) : el;
                this.length = jSql.count(el);
                return this;
            },
            //
            //
            forEach: function(method) {
                return jSql.forEach(this, method, true);
            },
            //
            //Aplica una funcion al elemento, si es una colección, a cada elemento de la misma.
            //Al método se le pasa como argumento el valor del elemento y el índice si es array o la propiedad y índice si es obj
            map: function(method) {
                var temporalResult, returnObj = jSql( this.isArray() ? [] : {});
               
                this.forEach(function(index) {  
                    temporalResult = method.call(self, this[index], index);
                    if(temporalResult != null) {
                       returnObj.add(temporalResult, index);
                    }
                });
                
                return jSql(returnObj.element);
            },
            //
            //Aplica una funcion a cada elemento de la coleccion. 
            //Si el retorno de la funcion es verdadero, se agrega a la colección que se devuelve
			filter: function(method, obj) { 
				var temporalResult, self = this, returnObj = jSql( this.isArray() ? [] : {});
				
				this.forEach(function(index) {
				    temporalResult = method.call(self, this[index], index);
				    if(temporalResult != null && temporalResult !== false) {
				        returnObj.add(this[index]);
				    }
				});
				
				return jSql(returnObj.element);
			},
			//
			//Agrega un objeto a otro, si se pasa prop, agrega la propiedad, si es array, intenta usar push.
			add: function(value, prop) {
                this.element = jSql.add(this.element, value, prop);
                this.length++;
                return this;
			},
            //
			//Selecciona los valores pasados en Selector (separados por espacios)
			//Ordered indica si es verdadero la coleccion devuelta debe estar en el orden original o sino en el pasado.
            select: function(selector, ordered) {
                var splittedSelector, returnObj = jSql(), len = 0, i = 0, tmpObj;
				
				if(selector) {
					splittedSelector = selector.split(' ');

					if(this.type ==="document"){
					    for(len = splittedSelector.length; i < len ; i++) {
					        tmpObj = this.getElement(splittedSelector[i], true);
					        if(tmpObj) {
					            if(jSql.isSingleObj(tmpObj)) {
					                returnObj.add(tmpObj, splittedSelector[i]);
					            } else {
					                returnObj = returnObj.merge(tmpObj);
					            }
					        }
					    }
					    return returnObj;
					} 
					else if(!ordered && this.type ==="array") {
					    returnObj = jSql([]);
						for(len = splittedSelector.length; i < len ; i++) {
							returnObj = returnObj.merge(this.map(function(value, prop, aux) {
								if(splittedSelector[i] === prop.toString()) {
									return value;
								}
								aux = (value.getElementsByTagName) ? value.getElementsByTagName(splittedSelector[i])[0] : "";
								if(value.nodeType && aux) {
								    return aux;
								}
								if(value[splittedSelector[i]]) {
								    return value[splittedSelector[i]];
								}
								
							}).element);
						}
						return returnObj;
					} else {
							return this.map(function(value, prop) {
								if(splittedSelector.indexOf(prop.toString()) !== -1)
									return value;
							});
					}
				}
				return returnObj;
            },
            //
            //Abreviacion para realizar filters
            //Soporta la sintaxis where(Propiedad[<,>,=]Valor), y pueden utilizarse && o || (son excluyentes)
            //Si se cumple la condicion retorna todo el elemento, sino, vacio.
            //Como Propiedad puede pasarse * que significa que todo elemento debe pasar la condicion
            where: function(selector, all) { 
                var splitAnd, splitOr, splitTotal, splitValueOp,
                    firstOp, secondOp, op, condition, 
                    len, i, functionResult, that = this,
                    setVars = function(expression) {
                        op = (expression.indexOf(">") !== -1) ? ">" : (expression.indexOf("<") !== -1) ? "<" : "=";
                        expression = expression.split(/>|=|</g);
                        firstOp = expression[0];
                        secondOp = expression[1];
                        secondOp = (secondOp.indexOf("'") !== -1) ? secondOp.replace(/\'/g,"") : parseInt(secondOp,10);
                        
                        if(op === '<')
                            condition =  function(val) { return val < secondOp; };
                        else if (op === '>')
                            condition = function(val) { return val > secondOp; };
                        else
                            condition = function(val) { return val === secondOp; };
                    },
                    func = function(type) {
                        return that[type](function(val, prop, auxContent) {
                            if(!val.nodeType) {
                                shouldReturnVal = (firstOp === '*' || (firstOp !== '*' && prop.toString() === firstOp)) ? condition(val) : 
                                                    (type ==="all") ? val : "";
                                if(shouldReturnVal) {
                                     return val;
                                }
                                return ;
                            }
                            auxContent = val.getElementsByTagName(firstOp);
                            
                            if(firstOp !== '*') {
                                auxContent = jSql.getTextContent(auxContent[0]);
                                auxContent = (auxContent) ? auxContent : val[firstOp];
                                if(condition(auxContent)) {
                                    return auxContent;
                                }
                            } else {
                                for (var i = 0, len = auxContent.length, txt ; i < len ; i++) {
                                    txt = jSql.getTextContent(auxContent[i]);
                                    txt = (txt) ? txt : val[firstOp];
                                    if(!condition(txt)) {
                                        return ;
                                    }
                                }
                                return val;
                            }
                        });
                    };
                    
                if(selector) {
                    
                    splitTotal = selector.split(/&&|\|\|+/);
                    splitAnd = selector.indexOf("&&") !== -1 ? selector.split(/\s?&&\s?/g) : "";
                    splitOr = selector.indexOf("||") !== -1 ? selector.split(/\s?\|\|\s?/g) : "";
                    
                    if(!splitAnd && !splitOr) {
                        setVars(selector);
                        if(all) {
                            if(func("all")) {
                                return this;
                            }
                        } else {
                            return func("filter");
                        }
                    } else if (splitAnd) {
                    
                        if(all) {
                            functionResult = true;
                            for ( i = 0, len = splitAnd.length ; i < len ; i++ ) {
                                setVars(splitAnd[i]);
                                if(!func("all")) {
                                    functionResult = false;
                                    break;
                                }
                            }
                        } else {
                            functionResult = jSql([]);
                            for ( i = 0, len = splitAnd.length ; i < len ; i++ ) {
                                setVars(splitAnd[i]);
                                functionResult.tmpElement = func("filter").element;
                                if(functionResult.tmpElement.length === 0) {
                                    functionResult = false;
                                    break;
                                }
                                functionResult.merge(functionResult.tmpElement);
                            }
                            if(functionResult) {
                                return functionResult;
                            }
                        }
                    } else if (splitOr) {
                        if(all) {
                            for ( i = 0, len = splitOr.length ; i < len ; i++ ) {
                                setVars(splitOr[i]);
                                functionResult = functionResult || func("all");
                            }
                        } else {
                            functionResult = jSql([]);
                            for ( i = 0, len = splitOr.length ; i < len ; i++ ) {
                                setVars(splitOr[i]);
                                functionResult.merge(func("filter").element);
                            }
                            return functionResult;
                        }
                    }
                }
                if(functionResult) {
                    return this;
                }
                return jSql([]);
                
            },
            //
            //Retorna todo si se cumple la condicion del where, sino nada.
            whereAll: function (selector) {
                return this.where(selector, true);
            },
            //
            //Ordena la coleccion, está orientado a usarse con arrays, u objetos que posean un método sort()
            //Puede pasarse [asc,desc] como primer parámetro, una funcion para ordenar o, si es un array de obj, el nombre de la propiedad.
            //por la cual ordenar y luego [asc,desc].
            orderBy: function(data, direction) { 
               var sorter = function(a, b) {
                     if (a < b) {
                        return asc ? -1 : 1; 
                     }
                     if (a > b) {
                        return asc ? 1 : -1;
                     }
                     return 0;
                }, asc, splitedData = [], len, i;
                
                if(this.element.sort) {
                    if(!direction && (data === "asc" || data === "desc")) {
                        asc = (data === "asc" || !data) ? 1 : 0;
                        this.element.sort(sorter);
                    } else {
                        if(jSql.isFunction(data)) {
                            this.element.sort(data || sorter);
                        } else {
    						asc = (direction === "desc") ? 0 : 1;
                            splitedData = data.split(' ');
                            for (len = splitedData.length, i = 0 ; i < len ; i++ )
                            {
                                this.element.sort(function(first, second) {
                                    return sorter(first[splitedData[i]], second[splitedData[i]]);
                                });
                            }
                        }
                    }
                }
                return this;
            },
            //
            //Retorna true si todo elemento de la coleccion pasa el método
            all: function(method) {
                if(method) {
                    return this.length === this.filter(method).length;
                }
                return false;
            },
            //
            //Retorna true si algún elemento de la coleccion pasa el método
            any: function(method) {
                if(method) {
                    return this.filter(method).length > 0;
                }
                return false;
            },
            //
            //
            first: function() {
                var elem = this.element;
                if(elem) {
                    if(elem.length) {
                        return elem[0];
                    } else {
                        return jSql.objToArray(elem)[0];
                    }
                }
                return;
            },
            //
            //
            last: function() {
                var len, elem = this.element;
                if(elem) {
                    if(elem.length) {
                        return elem[elem.length-1];
                    } else {
                        elem = jSql.objToArray(elem);
                        return elem[elem.length -1];
                    }
                }
                return;
            },
            //
            //Toma los "amount" primeros elementos de la coleccion
            take: function(amount) {
                var returnObj, i, len = this.element.length;
                if( amount && len) {
                    returnObj = [];
                    len = (amount > len ) ? len : amount;
                    for( i = 0, returnObj = [] ; i < len ; i++) {
                        returnObj.push(this.element[i]);
                    }
                    return jSql(returnObj);
                }
                return this;
            },
            //
            //Saltea los "amount" primeros elementos de la coleccion
            skip: function(amount) { 
                var returnObj, i, len = this.element.length;
                if( amount && len) {
                    returnObj = [];
                    if(amount < len) {
                        for( i = amount; i < len ; i++)
                            returnObj.push(this.element[i]);
                    }
                    else {
                        return jSql([]);
                    }
                    return jSql(returnObj);
                }
                return this;
            },
            //
            //
            distinct: function(selector) {
                var distinctObj = this, value,
                returnObj = (distinctObj.type === "array") ? jSql([]) : jSql({}),
                returnElem = returnObj.element;
                if(selector) {
                    distinctObj = distinctObj.select(selector);
                }
                distinctObj.forEach(function(i) {
                    var value = this[i];
                    if(!returnObj.contains(value)) {
                        jSql.add(returnElem, value, i);
                    }
                });
                return returnObj;
            },
            //
            //
            contains: function(value) {
                return jSql.contains(this.element, value);
            },
            equals: function(value) {
                return jSql.equals(this.element, value);
            },
            count: function() {
                return (this.length = jSql.count(this.element));
            },
            sum: function(selector) {
                return jSql.sum(this, selector)
            },
            min: function(selector) {
                return minOrMax(this, selector);
            },
            max: function(selector) {
                return minOrMax(this, selector, true);
            },
            //
            //Une dos objetos, loc es para uso interno
            //Siempre mantiene el tipo del primer objeto. Si no se pasa obj2, asume que quiere utilizarse this.element
            merge: function(obj, obj2, loc) { 
                var objType1 = jSql.detectType(obj), objType2 = (obj2) ? jSql.detectType(obj2) : jSql.detectType(this.element), 
                    returnObj;
				if(!obj2) {
					obj2 = obj;
					obj = this.element;
					loc = objType1;
					objType1 = objType2;
					objType2 = loc;
				}
				if(objType2 ==="number" || objType2 === "string") {
				    returnObj = jSql.add(obj, obj2, "0");
				} else if(objType1 === "array" && objType2 === "array")
                    returnObj = mergeArrays(obj, obj2);
                else if (objType1 === "array" && objType2 === "multiObj")
                    returnObj = mergeArrays(obj, jSql.objToArray(obj2));
				else
					returnObj = mergeProperties(obj, obj2);
				
				if(loc) {
				    return this.Instance(returnObj, this.type);
                }
				return returnObj;
            },
            //
            //Encuentra y devuelve el valor de la propiedad "prop", si no existe, retorna el elemento
            //Si el elemento es un documento, soporta la sintaxis # para ids y . para clases (sino busca tags)
            //Retorna un array con todos los tags que macheen (y un array con un elemento en caso de Id)
            getElement: function(prop, dontGetIt) {
                var result, selector;
                if(prop !== undefined) {
                    prop = prop.toString();
                    if(this.type === "document") {
                        selector = prop[0];
                        if(selector ==="#") {
                            result = [this.element.getElementById(prop.slice(1))];
                        } else if(selector === "." ){
                            result = Array.prototype.slice.call(this.element.getElementsByClassName(prop.slice(1)));
                        } else {
                            result = Array.prototype.slice.call(this.element.getElementsByTagName(prop));
                        }
                    }
                    if(!result || !result.length) {
                        result = this.element[prop];
                    }
                }
                if(result !== undefined) {
                    return result;
                }
                return (dontGetIt) ? undefined : this.element;
            },
            //
            //Métodos que devuelven el tipo del obj
            //El tipo puede ser, array, funcion, document, multiObj (objeto con propiedades), singleObj (Number o String)
            isArray: function() {
                return (Object.prototype.toString.call(this.element) === "[object Array]") ? "array" : "";
            },
            isSingleObj: function() {
                if(typeof this.element === "string") {
                    return "string"
                } else if(!isNaN(this.element)) {
                    return "number";
                }
                return "";
            },
            isFunction: function() {
                return (Object.prototype.toString.call(this.element) === "[object Function]") ? "function": "";
            },
            isDocument: function() {
                return (this.element && this.element.nodeType) ? "document": "";
            },
            //
            //
            getTextContent: function(prop) {
                var el = ( this.getElement ) ? this.getElement(prop) : this.element;
                if(el) {
                    return el.innerText || el.textContent;
                } 
                return;
            }
        };
        //Asignamos el prototipo para poderlo usar en las instancias
        jSql.prototype.Instance.prototype = jSql.prototype;

        //Métodos del objeto jSql
        mergeProperties(jSql, {
            //
            //Retorna una instancia de jSql, permite la sintaxis jSql.from(el).select(...) === jSql(el).select(...)
            from: function(element) {
                return (element.constructor !== jSql) ? jSql(element) : element;
            },
            //
            //Métodos que devuelven el tipo del obj
            isArray: function(obj) {
                return executeMethod("isArray", { element: obj});
            },
            isSingleObj: function(obj) {
                return executeMethod("isSingleObj", { element: obj });
            },
            isFunction: function(obj) {
                return executeMethod("isFunction", { element: obj });
            },
            isDocument: function(obj) {
                return executeMethod("isDocument", { element: obj });
            },
            //Detecta y retorna el tipo del obj pasado por parametro
			detectType: function(obj) {
				var result = this.isArray(obj);
				return result ? result : 
                       (result = this.isDocument(obj)) ? result :
				       (result = this.isFunction(obj)) ? result :
                       (result = this.isSingleObj(obj)) ? result :
                                "multiObj";
			},
			//
			//Une dos objetos y los retorna 
			//Si sql existe, devuelve una instancia de jSql, sino solo el elemento
            merge: function(obj1, obj2, sql) {
                var js = jSql.prototype.merge(obj1, obj2);
                return (sql) ? jSql(js) : js;
            },
            //
            //
            forEach: function(object, method, isInternal) {
                var i, len, prop, obj;
                obj = (isInternal) ? object.element : object;
                if(obj && obj.length) {
                    for ( i = 0, len = obj.length ; i < len ; i++) {
                        if( method.call(obj, i) === false ) {
                            break;
                        }
                    }
                } else {
                    for(prop in obj) {
                        if( method.call(obj, prop) === false) {
                            break;
                        }
                    }
                }
                return object;
            },
            add: function(destination, value, prop) {
                if(destination) {
                    if( destination.push ) {
                        destination.push(value);
                    } else {
                        destination[prop] = value;
                    }
                    return destination;
                }
                if(prop) {
                    destination = {};
                    destination[prop] = value;
                    return destination;
                }
                return value;
            },
            //
            //
            contains: function(toSearchIn, toFind) {
                var has =false;
                if (toSearchIn && toSearchIn.indexOf) {
                    return toSearchIn.indexOf(toFind) !== -1;
                }
                else {
                    jSql.forEach(toSearchIn, function(a) { 
                        if(this[a] === toFind) {
                            has = true;
                            return false;
                        }
                    });
                }
                return has;
            },
            equals: function(a, b) {
                var equals = true;
                jSql.forEach(a, function(prop) {
                    if(a[prop] !== b[prop]) {
                        equals = false;
                        return false;
                    }
                });
                return equals;
            },
            //
            //
            sum: function(obj, selector) {
                var acum;
                if(obj) {
                    if(selector) {
                        obj = jSql.from(obj).select(selector);
                    }
                    jSql.forEach(obj, function(i, aux) {
                        if(!acum) {
                            acum = this[i];
                        } else {
                            acum += this[i];
                        }
                    }, true);
                }
                return acum;
            },
            min: function(obj, selector) {
                return minOrMax(obj, selector);
            },
            max: function(obj, selector) {
                return minOrMax(obj, selector, true);
            },
            //
            //Convierte un array en un objeto, con propiedades enumeradas
			arrayToObj: function(array) {
			    if(!array.length) array = [array];
                for(var obj = {}, len = array.length, i = 0; i < len ; obj[i.toString()] = array[i++]){ }
                return obj;
            },
            //
            //Convierte un objeto (o cualquier cosa con propiedades) en un array.
            objToArray: function(obj) {
                var prop, arr = [];
                for(prop in obj) {
                    if(obj.hasOwnProperty(prop)) {
                        arr.push(obj[prop]);
                    }
                }
                if(!arr.length) {
                    arr.push(obj);
                }
                return arr;
            },
            //
            //Obtiene el tamaño de un objeto, contando las propiedades que le pertenecen
            count: function(obj) {
                var len = 0, prop;
                if(obj) {
                    if(!obj.length) {
                        for(prop in obj) {
                            if(obj.hasOwnProperty(prop)) {
                                len++;
                            }
                        }
                        return len ? len : 1;
                    }
                    else {
                        return obj.length;
                    }
                }
                return 0;
            },
            //
            //
            getTextContent: function(obj, prop) {
                return executeMethod("getTextContent", { element: obj }, prop);
            }
        });
        
        //Se retorna el objeto local y se asigna el global
        return (window.jSql = jSql);
    })();
    
})(window);