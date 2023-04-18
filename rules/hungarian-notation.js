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
          onlyDeclarations: {
            type: "boolean",
            default: false,
          },
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

    const aTypes = [
      "VariableDeclarator",
      "FunctionExpression",
      "FunctionDeclaration",
    ];

    const aRegExpChecks = [
      // allow hungarian notation (with snakeCase) for declarations
      /^_?(\$|fn|[a-z]|)([A-Z]+[a-z0-9]*)+$/,
      // allow PascalCase e.g. for class names
      /^(_?[A-Z]+[a-z0-9]*)+$/,
      // allow upper snake case for constants
      /^([A-Z0-9]+_*)+$/,
    ];

    const oOptions = oContext.options[0] || {};
    const bOnlyDeclarations = !!oOptions.onlyDeclarations;
    const aIgnore = oOptions.ignore || [];

    // allow some special cases
    let aWhitelist = ["[a-z]", "resolve", "reject", "sap", "jQuery"];
    aWhitelist = aWhitelist.concat(aIgnore);

    aRegExpChecks.push(new RegExp("^(" + aWhitelist.join("|") + ")$"));

    return {
      Identifier(oNode) {
        const sName = oNode.name;
        const oParent =
          oNode.parent.type === "MemberExpression"
            ? oNode.parent.parent
            : oNode.parent;

        if (!aTypes.some((sType) => sType === oNode.parent.type)) return;

        const isDeclaration =
          (oParent.type === "FunctionDeclaration" &&
            oParent.id.name === sName) ||
          oParent.type === "VariableDeclarator";

        if (isDeclaration || !bOnlyDeclarations) {
          if (!aRegExpChecks.some((r) => r.test(sName))) {
            oContext.report(oNode, sErrorMsg);
          }
        }
      },
    };
  },
};
