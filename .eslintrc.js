module.exports = {
    "extends": "airbnb-base",
    "rules": {
        "indent": ["error", 4],
        "camelcase": ["warn"],
        "max-len": ["warn"],
        "brace-style": ["error", "stroustrup"],
        "no-console": ["error", { "allow": ["warn", "error"] }],
        "prefer-const": ["error", {"destructuring": "all"}],
        "no-await-in-loop": ["warn"],
        "no-restricted-syntax": 0,
        "prefer-destructuring": ["warn"],
        "radix": ["error", "as-needed"],
        "no-underscore-dangle": 0
    }
};