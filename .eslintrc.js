module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "webextensions": true,
    },
    "parserOptions": {
        "ecmaVersion": 2022,
        "sourceType": "module"
    },    
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": "off",
        "no-extra-semi": [
            "error"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-undef": "off",
        "no-unused-vars": "off",
        "space-before-blocks": ["error", "always"],
        "space-before-function-paren": ["error", {
            "anonymous": "never",    // function() {}
            "named": "never",        // function foo() {}
            "asyncArrow": "always"   // async () => {}
        }],
        // Space around keywords (if, for, etc.)
        "keyword-spacing": ["error", {
            "before": true,
            "after": true
        }],
    },
    "globals": {
        "chrome": "readonly",
        "GrabbyCore": "readonly",
        "PreGrabActions": "readonly",
        "PostGrabActions": "readonly",
        "removeTag": "readonly",
        "unwrapTag": "readonly",
        "cleanHTML": "readonly",
        "cleanText": "readonly",
    }
};