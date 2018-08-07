/**
 * Produces a function which uses template strings to do simple interpolation from objects.
 * 
 * Usage:
 *    const makeMeKing = generateTemplateString('${name} is now the king of ${country}!');
 * 
 *    console.log(makeMeKing({ name: 'Bryan', country: 'Scotland'}));
 *    // Logs 'Bryan is now the king of Scotland!'
 */
const cache = {};

module.exports = function generateTemplate(template) {
    let fn = cache[template];

    if (!fn) {
        // Replace ${expressions} (etc) with ${map.expressions}.

        const sanitized = template
            .replace(/\$\{([\s]*[^;\s\{]+[\s]*)\}/g, function(_, match) {
                return `\$\{map.${match.trim()}\}`;
            })
            // Afterwards, replace anything that's not ${map.expressions}' (etc) with a blank string.
            .replace(/(\$\{(?!map\.)[^}]+\})/g, '');

        fn = Function('map', `return \`${sanitized}\``);
    }
    
    return fn;
}