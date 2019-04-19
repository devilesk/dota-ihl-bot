const func = () => {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      reject(new Error('foo'));
    });
  });
};

const main = async () => {
  try {
    await func();
  } catch (ex) {
    console.log('will not execute');
  }
};

main();