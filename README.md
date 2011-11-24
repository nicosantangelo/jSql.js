<p>
jSql aims to provide a set of sql-like methods to make the processing of large entities easy.
</p>
Some examples:

#Arrays
	var testArray = [1,2,3,4,5,6,7,8,9,10];
	
	jSql(testArray).skip(3).take(2); // an instance of jSql that holds [4, 5]
	
	jSql([1,2,3,4,5,6,67,7,89,9]).select("3 2")  //select positions 3 and 2
				     .getElement(); // [4, 3]
	
	jSql(testArray).sum(); //55
	

#Objects		
	var arrOfObj = [{ name: "George" }, { year: 2000 }, { name: "Robert" }, { name: "Jill" }, { name: "George" }];
	
	jSql(arrOfObj).select("name")
		      .where("0='George'||0='Olivia'")
		      .getElement(); // ["George"]
	
	jSql(arrOfObj).select("name")
		      .whereAll("0='George'||0='Robert'")
		      .getElement() // ["George", "Robert", "Jill", "George"]
	
	jSql([1,2,3,1]).merge([1,2,3,1])  // [1, 2, 3, 1, 1, 2, 3, 1]
		       .distinct() 	 // filter duplicated content
		       .getElement()    // [1, 2, 3]
	
#Quick Test

To see the available methods, you could use jSql, and log out the following:

    jSql(jSql.prototype).map(function(func, name) {
        console.log(name);
    });
    jSql(jSql).map(function(func, name) {
        console.log(name);
    });
