"use strict";

module.exports = {
  meta: {
    docs: {
      description: "Use hungarian notation when declaring variables",
      category: "Stylistic Issues",
      recommended: false,
    },
    fixable: null, // or "code" or "whitespace"
    schema: [
      {
        type: "object",
        properties: {
          ignore: {
            type: "array",
            items: {
              type: "string",
            },
            uniqueItems: true,
          },
        },
      },
    ],
  },

  create: function (oContext) {
    const sErrorMsg = "Variable not named after hungarian notation";

    const aRegExpChecksVariable = [
      // allow hungarian notation (with snakeCase) for declarations
      /^_?(\$|fn|[a-z])([A-Z]+[a-z0-9]*)+$/,
      // allow upper snake case for constants
      /^([A-Z0-9]+_*)+$/,
    ];

    const aRegExpChecksParameter = [
      // allow pascal case for function parameters
      /^([A-Z][a-zA-Z0-9]*)+$/,
      ...aRegExpChecksVariable,
    ];

    const oOptions = oContext.options[0] || {};
    const aIgnore = oOptions.ignore || [];

    // allow some special cases
    let aWhitelist = ["[a-z]", "resolve", "reject", "sap", "jQuery"];
    aWhitelist = aWhitelist.concat(aIgnore);

    aRegExpChecksVariable.push(new RegExp("^(" + aWhitelist.join("|") + ")$"));
    aRegExpChecksParameter.push(new RegExp("^(" + aWhitelist.join("|") + ")$"));

    const oDeclarations = {
      oVariable: {
        TYPE: "VariableDeclaration",
        getNames(oNode) {
          return oNode.declarations
            .map((oChildNode) =>
              oChildNode?.type === "VariableDeclarator" &&
              oChildNode?.init?.type !== "ArrowFunctionExpression" &&
              oChildNode?.init?.type !== "FunctionExpression"
                ? oChildNode?.id?.name
                : null
            )
            .filter(Boolean);
        },
        isRequire(oNode) {
          return oNode.declarations.some((oChildNode) => {
            return (
              oChildNode.type === "CallExpression" &&
              oChildNode.callee &&
              oChildNode.callee.name === "require"
            );
          });
        },
        checkNames(oNode) {
          return !oDeclarations.oVariable.isRequire(oNode)
            ? oDeclarations.oVariable
                .getNames(oNode)
                .reduce((aIncorrectNames, sName) => {
                  if (
                    aRegExpChecksVariable.some((oRegExp) =>
                      oRegExp.test(sName)
                    ) === false
                  ) {
                    aIncorrectNames.push(sName);
                  }
                  return aIncorrectNames;
                }, [])
            : [];
        },
      },
      oFunction: {
        TYPE: "FunctionDeclaration",
        getNames(oNode) {
          return oNode.params
            .map(
              (oChildNode) =>
                oChildNode?.name ||
                oChildNode?.id?.name ||
                oChildNode?.left?.name ||
                oChildNode?.argument?.name
            )
            .filter(Boolean);
        },
        checkNames(oNode) {
          return oDeclarations.oFunction
            .getNames(oNode)
            .reduce((aIncorrectNames, sName) => {
              if (
                aRegExpChecksParameter.some((oRegExp) =>
                  oRegExp.test(sName)
                ) === false
              ) {
                aIncorrectNames.push(sName);
              }
              return aIncorrectNames;
            }, []);
        },
      },
    };

    const oExpressions = {
      oFunction: {
        TYPE: "FunctionExpression",
        checkNames: oDeclarations.oFunction.checkNames,
      },
      oArrowFunction: {
        TYPE: "ArrowFunctionExpression",
        checkNames(oNode) {
          return oDeclarations.oFunction
            .getNames(oNode)
            .reduce((aIncorrectNames, sName) => {
              if (
                aRegExpChecksVariable.some((oRegExp) => oRegExp.test(sName)) ===
                false
              ) {
                aIncorrectNames.push(sName);
              }
              return aIncorrectNames;
            }, []);
        },
      },
    };

    const reportNames = (oNode, aIncorrectNames, sRule) => {
      aIncorrectNames.forEach((sName) => {
        oContext.report(oNode, `'${sName}': ${sErrorMsg} [${sRule}]`);
      });
    };

    return {
      VariableDeclaration(oNode) {
        const aIncorrectNames = oDeclarations.oVariable.checkNames(oNode) || [];
        reportNames(oNode, aIncorrectNames, "VariableDeclaration");
      },
      FunctionDeclaration(oNode) {
        const aIncorrectNames = oDeclarations.oFunction.checkNames(oNode) || [];
        reportNames(oNode, aIncorrectNames, "FunctionDeclaration");
      },
      FunctionExpression(oNode) {
        const aIncorrectNames = oExpressions.oFunction.checkNames(oNode) || [];
        reportNames(oNode, aIncorrectNames, "FunctionExpression");
      },
      ArrowFunctionExpression(oNode) {
        const aIncorrectNames =
          oExpressions.oArrowFunction.checkNames(oNode) || [];
        reportNames(oNode, aIncorrectNames, "ArrowFunctionExpression");
      },
    };
  },
};
